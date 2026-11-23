"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  departmentsFromPrivileges,
  expandPrivileges,
  groupScope,
  type ConsoleGroup,
} from "@/lib/access";
import { isDefaultGroupId } from "@/lib/hq-seed";
import {
  deleteGroup,
  refreshSessionFromGroup,
  saveGroup,
} from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";
import { accessTree } from "@/lib/nav";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  SetupStat,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { emptyGroup, GroupFormSheet } from "@/components/setup/groups/GroupFormSheet";

const SUPERVISOR_PRIVS = new Set([
  "audit",
  "staff",
  "setup",
  "settings",
  "manager",
  "supervisor",
]);

function privilegeLabels(group: ConsoleGroup) {
  if (group.privileges.includes("*")) return ["All HQ access"];
  const granted = expandPrivileges(group.privileges, groupScope(group));
  const labels: string[] = [];
  for (const section of accessTree()) {
    for (const item of section.items) {
      if (granted.has(item.id) || item.children?.some((child) => granted.has(child.id))) {
        labels.push(item.label);
      }
    }
  }
  return labels;
}

function tillBehaviour(group: ConsoleGroup) {
  if (group.privileges.includes("*") || group.privileges.includes("settings")) {
    return "PIN opens till Settings and authorises supervisor actions.";
  }
  if ([...SUPERVISOR_PRIVS].some((privilege) => group.privileges.includes(privilege))) {
    return "PIN authorises supervisor actions; Settings still needs an admin PIN.";
  }
  return "Till PIN is for sign-in only.";
}

function RoleCard({
  group,
  members,
  onEdit,
  onDelete,
}: {
  group: ConsoleGroup;
  members: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isDefault = isDefaultGroupId(group.id);
  const labels = privilegeLabels(group);
  return (
    <div className="flex min-h-[210px] flex-col rounded-[18px] border border-pos-border bg-pos-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold tracking-tight text-pos-ink">{group.name}</p>
          <p className="mt-1 text-[12px] text-pos-ink-faint">
            {members} {members === 1 ? "member" : "members"} ·{" "}
            {group.privileges.includes("*") ? "Full access" : `${group.privileges.length} privileges`}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
            isDefault
              ? "bg-pos-surface-muted text-pos-ink-faint"
              : "bg-pos-primary/10 text-pos-primary"
          }`}
        >
          {isDefault ? <LockKeyhole size={12} /> : <ShieldCheck size={12} />}
          {isDefault ? "Default · locked" : "Custom"}
        </span>
      </div>

      <div className="mt-4 max-h-32 overflow-y-auto pr-1">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-pos-ink-faint">
          Privileges
        </p>
        <div className="flex flex-wrap gap-1.5">
          {labels.length === 0 ? (
            <span className="text-[12px] text-pos-ink-faint">No HQ sections granted</span>
          ) : (
            labels.map((label) => (
              <span
                key={label}
                className="rounded-lg bg-pos-surface-muted px-2 py-1 text-[11px] text-pos-ink-muted"
              >
                {label}
              </span>
            ))
          )}
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-pos-ink-muted">{tillBehaviour(group)}</p>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {isDefault ? (
          <span className="text-[11px] text-pos-ink-faint">
            Built-in role — privileges cannot be changed.
          </span>
        ) : (
          <>
            <button type="button" className={secondaryButtonClass} onClick={onEdit}>
              <Pencil size={14} />
              Edit privileges
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onDelete}>
              <Trash2 size={14} />
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function RolePrivilegesManager() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const { accounts, groups: allGroups, live, ready } = useLiveDirectory();
  const groups = useMemo(() => allGroups.filter((row) => groupScope(row) === "tenant"), [allGroups]);
  const [draft, setDraft] = useState<ConsoleGroup>(emptyGroup());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const memberCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of groups) map.set(group.id, 0);
    for (const account of accounts) map.set(account.groupId, (map.get(account.groupId) ?? 0) + 1);
    return map;
  }, [accounts, groups]);

  const defaults = groups.filter((group) => isDefaultGroupId(group.id));
  const custom = groups.filter((group) => !isDefaultGroupId(group.id));

  function openCreate() {
    setDraft(emptyGroup());
    setSheetOpen(true);
  }

  function openEdit(group: ConsoleGroup) {
    if (isDefaultGroupId(group.id)) return;
    setDraft(group);
    setSheetOpen(true);
  }

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error("Role name is required.");
      return;
    }
    setBusy(true);
    try {
      const privileges = draft.privileges.includes("*") ? ["*"] : draft.privileges;
      const saved = await saveGroup({
        ...draft,
        privileges,
        departments: privileges.includes("*")
          ? ["*"]
          : departmentsFromPrivileges(privileges, groupScope(draft)),
      });
      setSheetOpen(false);
      if (session) setSession(refreshSessionFromGroup(session, saved));
      toast.success("Role saved. Access updates immediately.");
      if (!draft.id) router.push(`/setup/users/group/${encodeURIComponent(saved.id)}`);
    } catch (err) {
      toast.error(err, "Could not save role");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!draft.id || isDefaultGroupId(draft.id)) return;
    await removeGroup(draft);
    setSheetOpen(false);
  }

  async function removeGroup(group: ConsoleGroup) {
    if (isDefaultGroupId(group.id)) return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      toast.success("Custom role deleted.");
    } catch (err) {
      toast.error(err, "Could not delete role");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="groups" />;

  return (
    <div>
      <SetupHeader
        kicker="Setup · Access"
        title="Roles & privileges"
        copy="Default roles are fixed. Create custom roles to grant exactly the access each person needs — changes apply to accounts and the till as soon as they are saved."
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
            <PrimaryButton onClick={openCreate}>
              <Plus size={16} />
              Create custom role
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Default roles" value={String(defaults.length)} hint="Locked" />
        <SetupStat label="Custom roles" value={String(custom.length)} hint="Editable" tone="accent" />
        <SetupStat label="Team accounts" value={String(accounts.length)} hint="Assigned to a role" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-pos-border bg-pos-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <Users size={18} className="mt-0.5 shrink-0 text-pos-primary" />
          <div>
            <p className="text-[13px] font-semibold text-pos-ink">Company admins are staff too</p>
            <p className="mt-1 text-[12px] leading-relaxed text-pos-ink-muted">
              Active HQ account holders already appear in the PIN dropdown with the role assigned
              here. Set their PIN in Security. A cashier PIN only signs in; supervisor and higher
              roles authorise the actions their privileges allow.
            </p>
          </div>
        </div>
        <Link
          href="/setup/others/settings?section=security#till-pin"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pos-primary"
        >
          Set staff PINs <ArrowUpRight size={14} />
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
          Default roles · read only
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {defaults.map((group) => (
            <RoleCard
              key={group.id}
              group={group}
              members={memberCount.get(group.id) ?? 0}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
          Custom roles · editable
        </h2>
        {custom.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-pos-border bg-pos-surface/50 px-5 py-10 text-center">
            <p className="text-sm text-pos-ink-muted">No custom roles yet.</p>
            <p className="mt-1 text-[12px] text-pos-ink-faint">
              Create one to add or remove privileges without touching the defaults.
            </p>
            <PrimaryButton className="mt-4" onClick={openCreate}>
              <Plus size={15} /> Create custom role
            </PrimaryButton>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {custom.map((group) => (
              <RoleCard
                key={group.id}
                group={group}
                members={memberCount.get(group.id) ?? 0}
                onEdit={() => openEdit(group)}
                onDelete={() => void removeGroup(group)}
              />
            ))}
          </div>
        )}
      </section>

      <GroupFormSheet
        open={sheetOpen}
        draft={draft}
        busy={busy}
        onClose={() => setSheetOpen(false)}
        onChange={setDraft}
        onSubmit={onSave}
        onDelete={draft.id && !isDefaultGroupId(draft.id) ? onDelete : undefined}
      />
    </div>
  );
}
