"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  compressPrivileges,
  departmentsFromPrivileges,
  expandPrivileges,
  groupScope,
  isChecked,
  isIndeterminate,
  toggleAccessNode,
  accessParentMap,
  type ConsoleGroup,
  type GroupScope,
} from "@/lib/access";
import { accessTree, type AccessNode } from "@/lib/nav";
import { producerAccessTree } from "@/lib/producer-nav";
import { groupTone } from "../accounts/account-ui";
import { Field, PrimaryButton, fieldClass, secondaryButtonClass } from "../SetupChrome";

function PrivilegeNodeRow({
  node,
  granted,
  onToggle,
}: {
  node: AccessNode;
  granted: Set<string>;
  onToggle: (node: AccessNode) => void;
}) {
  const checked = isChecked(granted, node);
  const mixed = isIndeterminate(granted, node);

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 text-sm hover:bg-pos-surface-muted">
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
      {node.children?.length ? (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-pos-border/60 pl-3">
          {node.children.map((child) => (
            <PrivilegeNodeRow
              key={child.id}
              node={child}
              granted={granted}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function emptyGroup(scope: GroupScope = "tenant"): ConsoleGroup {
  return {
    id: "",
    name: "",
    scope,
    departments: [],
    privileges: [],
  };
}

export function GroupFormSheet({
  open,
  draft,
  busy,
  onClose,
  onChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  draft: ConsoleGroup;
  busy: boolean;
  onClose: () => void;
  onChange: (next: ConsoleGroup) => void;
  onSubmit: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const isEdit = Boolean(draft.id);
  const scope = groupScope(draft);
  const granted = expandPrivileges(draft.privileges, scope);
  const tree = scope === "producer" ? producerAccessTree() : accessTree();
  const parentOf = accessParentMap(scope);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-xl flex-col bg-pos-bg text-pos-ink shadow-pos-md">
        <header className="flex shrink-0 items-start justify-between gap-4 bg-pos-surface px-6 py-5 shadow-pos-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              {scope === "producer" ? "Producer · Privileges" : "Setup · Users"}
            </p>
            <h2 className="mt-2 text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
              {isEdit ? draft.name || "Edit group" : "New group"}
            </h2>
            <p className="mt-2 text-sm text-pos-ink-muted">
              Tick only the sidebar menus this role should see. Unticked pages are hidden and
              blocked.
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink hover:bg-pos-border/60"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <Field label="Group name">
              <input
                className={fieldClass}
                value={draft.name}
                onChange={(event) => onChange({ ...draft, name: event.target.value })}
                placeholder={scope === "producer" ? "e.g. Partnerships" : "e.g. Cashier"}
                required
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-semibold text-pos-ink">Sidebar access</p>
              <p className="mb-3 text-[13px] text-pos-ink-muted">
                Same categories as the console sidebar. Sensitive areas stay off unless you tick
                them.
              </p>
              <div className="space-y-1">
                {tree.map((section) => (
                  <div
                    key={section.heading}
                    className="rounded-2xl border border-pos-border bg-pos-surface p-3"
                  >
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-pos-ink-faint">
                      {section.heading}
                    </p>
                    {section.items.map((node) => (
                      <PrivilegeNodeRow
                        key={node.id}
                        node={node}
                        granted={granted}
                        onToggle={(target) => {
                          const privileges = compressPrivileges(
                            toggleAccessNode(granted, target, parentOf),
                            scope,
                          );
                          onChange({
                            ...draft,
                            scope,
                            privileges,
                            departments: departmentsFromPrivileges(privileges, scope),
                          });
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {draft.name ? (
              <span
                className={`inline-flex rounded-lg px-2.5 py-1 text-[12px] font-medium ${groupTone(draft.name)}`}
              >
                {draft.name}
              </span>
            ) : null}
          </div>

          <footer className="flex shrink-0 gap-2 border-t border-pos-border bg-pos-surface px-5 py-4">
            {isEdit && onDelete ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={() => void onDelete()}
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
            )}
            <PrimaryButton type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save privileges" : "Create group"}
            </PrimaryButton>
          </footer>
        </form>
      </aside>
    </div>
  );
}
