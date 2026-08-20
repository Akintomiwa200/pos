"use client";

import { useEffect, useState } from "react";
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
        className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 text-sm hover:bg-[#f6f5f8]"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <input
          type="checkbox"
          className="accent-[#6d4aff]"
          checked={checked}
          ref={(el) => {
            if (el) el.indeterminate = mixed;
          }}
          onChange={() => onToggle(node)}
        />
        <span className={checked ? "font-medium text-[#1c1c1e]" : "text-neutral-600"}>
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
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
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
      setError(err instanceof Error ? err.message : "Could not load groups");
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
    setError("");
    setStatus("");
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
    setError("");
    setStatus("");
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
      setStatus("Group saved. Sidebar updates for accounts in this group.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save group");
    }
  }

  async function onDelete() {
    if (!draft.id) return;
    setError("");
    try {
      await deleteGroup(draft.id);
      const rows = await listGroups();
      setGroups(rows);
      const next = rows[0] ?? emptyGroup();
      setSelectedId(next.id);
      setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete group");
    }
  }

  if (!ready) return <ManagerSkeleton variant="groups" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <button
          type="button"
          className="mb-2 w-full rounded-lg bg-[#f4f0ff] px-3 py-2 text-left text-sm font-medium text-[#6d4aff]"
          onClick={() => {
            const next = emptyGroup();
            setSelectedId("");
            setDraft(next);
            setStatus("");
            setError("");
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
                ? "bg-[#f4f0ff] font-semibold text-[#6d4aff]"
                : "text-neutral-700 hover:bg-[#f6f5f8]"
            }`}
          >
            {group.name}
          </button>
        ))}
      </aside>

      <section className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <label className="text-sm font-medium">Group name</label>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="mt-1 w-full max-w-md rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
          placeholder="Supervisor"
        />

        <p className="mt-6 text-sm font-semibold">Departments</p>
        <p className="mt-1 text-sm text-neutral-500">
          Only these sidebar sections can appear for this group.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {DEPARTMENTS.map((heading) => {
            const on = draft.departments.includes("*") || draft.departments.includes(heading);
            return (
              <label
                key={heading}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  on ? "border-[#6d4aff] bg-[#f4f0ff] text-[#6d4aff]" : "border-neutral-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-[#6d4aff]"
                  checked={on}
                  onChange={() => toggleDepartment(heading)}
                />
                {heading}
              </label>
            );
          })}
        </div>

        <p className="mt-6 text-sm font-semibold">Privileges</p>
        <p className="mt-1 text-sm text-neutral-500">
          Tick a parent to grant every page under it. Unticked pages stay hidden.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {tree.map((section) => {
            const enabled =
              draft.departments.includes("*") || draft.departments.includes(section.heading);
            return (
              <div
                key={section.heading}
                className={`rounded-xl border border-neutral-100 p-3 ${enabled ? "" : "opacity-40"}`}
              >
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
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

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {status ? <p className="mt-4 text-sm text-emerald-700">{status}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-[#6d4aff] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save group
          </button>
          {draft.id ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
            >
              Delete
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
