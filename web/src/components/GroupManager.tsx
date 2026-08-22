"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEPARTMENTS,
  compressPrivileges,
  expandPrivileges,
  isChecked,
  isIndeterminate,
  toggleAccessNode,
  accessParentMap,
  type ConsoleGroup,
} from "../lib/access";
import { accessTree, type AccessNode, type DepartmentName } from "../lib/nav";
import { deleteGroup, listGroups, refreshSessionFromGroup, saveGroup } from "../lib/hq-api";
import { useAuth } from "./AuthProvider";
import { ManagerSkeleton } from "./Skeleton";

function PrivilegeNodeRow({
  node,
  granted,
  onToggle,
  depth = 0,
}: {
  node: AccessNode;
  granted: Set<string>;
  onToggle: (node: AccessNode) => void;
  depth?: number;
}) {
  const checked = isChecked(granted, node);
  const mixed = isIndeterminate(granted, node);

  return (
    <div>
      <label
        className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 text-sm hover:bg-pos-surface-muted"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <input
          type="checkbox"
          className="accent-pos-primary"
          checked={checked}
          ref={(el) => {
            if (el) el.indeterminate = mixed;
          }}
          onChange={() => onToggle(node)}
        />
        <span className={checked ? "font-medium text-pos-ink" : "text-pos-ink-muted"}>
          {node.label}
        </span>
      </label>
      {node.children?.map((child) => (
        <PrivilegeNodeRow
          key={child.id}
          node={child}
          granted={granted}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

const emptyGroup = (): ConsoleGroup => ({
  id: "",
  name: "",
  departments: ["*"],
  privileges: ["*"],
});

export function GroupManager() {
  const { session, setSession } = useAuth();
  const [groups, setGroups] = useState<ConsoleGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<ConsoleGroup>(emptyGroup());
  const [ready, setReady] = useState(false);

  async function load() {
    const rows = await listGroups();
    setGroups(rows);
    const current = rows.find((row) => row.id === selectedId) ?? rows[0];
    if (current) {
      setSelectedId(current.id);
      setDraft(current);
    }
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load groups");
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const granted = expandPrivileges(draft.privileges);
  const tree = accessTree();
  const parentOf = accessParentMap();

  function select(group: ConsoleGroup) {
    setSelectedId(group.id);
    setDraft(group);
  }

  function toggleDepartment(heading: DepartmentName) {
    const all = draft.departments.includes("*");
    const current = all ? [...DEPARTMENTS] : draft.departments.filter((d) => d !== "*");
    const next = current.includes(heading)
      ? current.filter((d) => d !== heading)
      : [...current, heading];
    setDraft({
      ...draft,
      departments: next.length === DEPARTMENTS.length ? ["*"] : (next as ConsoleGroup["departments"]),
    });
  }

  async function onSave() {
    try {
      const saved = await saveGroup({
        ...draft,
        privileges: compressPrivileges(granted),
      });
      const rows = await listGroups();
      setGroups(rows);
      setSelectedId(saved.id);
      setDraft(saved);
      if (session) setSession(refreshSessionFromGroup(session, saved));
      toast.success("Group saved. Sidebar updates for accounts in this group.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save group");
    }
  }

  async function onDelete() {
    if (!draft.id) return;
    try {
      await deleteGroup(draft.id);
      const rows = await listGroups();
      setGroups(rows);
      const next = rows[0] ?? emptyGroup();
      setSelectedId(next.id);
      setDraft(next);
      toast.success("Group deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete group");
    }
  }

  if (!ready) return <ManagerSkeleton variant="groups" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-2xl bg-pos-surface p-3 shadow-pos-md">
        <button
          type="button"
          className="mb-2 w-full rounded-lg bg-pos-primary-soft px-3 py-2 text-left text-sm font-medium text-pos-primary"
          onClick={() => {
            const next = emptyGroup();
            setSelectedId("");
            setDraft(next);
          }}
        >
          New group
        </button>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => select(group)}
            className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
              group.id === selectedId
                ? "bg-pos-primary-soft font-semibold text-pos-primary"
                : "text-pos-ink hover:bg-pos-surface-muted"
            }`}
          >
            {group.name}
          </button>
        ))}
      </aside>

      <section className="rounded-2xl bg-pos-surface p-6 shadow-pos-md">
        <label className="text-sm font-medium text-pos-ink">Group name</label>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="mt-1 w-full max-w-md rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary"
          placeholder="Supervisor"
        />

        <p className="mt-6 text-sm font-semibold text-pos-ink">Departments</p>
        <p className="mt-1 text-sm text-pos-ink-muted">
          Only these sidebar sections can appear for this group.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {DEPARTMENTS.map((heading) => {
            const on = draft.departments.includes("*") || draft.departments.includes(heading);
            return (
              <label
                key={heading}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  on ? "border-pos-primary bg-pos-primary-soft text-pos-primary" : "border-pos-border text-pos-ink"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-pos-primary"
                  checked={on}
                  onChange={() => toggleDepartment(heading)}
                />
                {heading}
              </label>
            );
          })}
        </div>

        <p className="mt-6 text-sm font-semibold text-pos-ink">Privileges</p>
        <p className="mt-1 text-sm text-pos-ink-muted">
          Tick a parent to grant every page under it. Unticked pages stay hidden.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {tree.map((section) => {
            const enabled =
              draft.departments.includes("*") || draft.departments.includes(section.heading);
            return (
              <div
                key={section.heading}
                className={`rounded-xl border border-pos-border p-3 ${enabled ? "" : "opacity-40"}`}
              >
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-primary">
                  {section.heading}
                </p>
                {section.items.map((node) => (
                  <PrivilegeNodeRow
                    key={node.id}
                    node={node}
                    granted={granted}
                    onToggle={(target) =>
                      setDraft({
                        ...draft,
                        privileges: compressPrivileges(toggleAccessNode(granted, target, parentOf)),
                      })
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save group
          </button>
          {draft.id ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
            >
              Delete
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
