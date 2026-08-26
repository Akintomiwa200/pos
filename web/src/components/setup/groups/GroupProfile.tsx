"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  departmentsFromPrivileges,
  expandPrivileges,
  groupScope,
  type ConsoleGroup,
} from "@/lib/access";
import { accessTree } from "@/lib/nav";
import { producerAccessTree } from "@/lib/producer-nav";
import {
  deleteGroup,
  refreshSessionFromGroup,
  saveGroup,
} from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { PersonAvatar, groupTone, statusTone } from "@/components/setup/accounts/account-ui";
import { GroupFormSheet } from "./GroupFormSheet";
import { groupVisual, isAdminGroup, privilegeSummary, roleBlurb } from "./group-ui";
import { isDefaultGroupId } from "@/lib/hq-seed";

export function GroupProfile({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const { accounts, groups, ready } = useLiveDirectory();
  const group = groups.find((row) => row.id === groupId) ?? null;
  const [draft, setDraft] = useState<ConsoleGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const members = useMemo(
    () => accounts.filter((row) => row.groupId === groupId),
    [accounts, groupId],
  );

  const grantedLabels = useMemo(() => {
    if (!group) return [];
    if (group.privileges.includes("*")) return ["Everything in the sidebar"];
    const granted = expandPrivileges(group.privileges, groupScope(group));
    const labels: string[] = [];
    const tree = groupScope(group) === "producer" ? producerAccessTree() : accessTree();
    for (const section of tree) {
      for (const item of section.items) {
        if (granted.has(item.id) || item.children?.some((child) => granted.has(child.id))) {
          labels.push(`${section.heading} · ${item.label}`);
        }
      }
    }
    return labels;
  }, [group]);

  function openEdit() {
    if (!group) return;
    setDraft(group);
    setSheetOpen(true);
  }

  async function onSave() {
    if (!draft?.name.trim()) {
      toast.error("Group name is required.");
      return;
    }
    setBusy(true);
    try {
      const privileges = draft.privileges.includes("*")
        ? ["*"]
        : draft.privileges;
      const saved = await saveGroup({
        ...draft,
        privileges,
        departments: draft.privileges.includes("*")
          ? ["*"]
          : departmentsFromPrivileges(privileges, groupScope(draft)),
      });
      setSheetOpen(false);
      if (session) setSession(refreshSessionFromGroup(session, saved));
      toast.success("Group saved. Sidebar updates for accounts in this group.");
    } catch (err) {
      toast.error(err, "Could not save group");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!group?.id) return;
    if (isDefaultGroupId(group.id)) {
      toast.error("Default groups cannot be deleted.");
      return;
    }
    setBusy(true);
    try {
      await deleteGroup(group.id);
      toast.success("Group deleted.");
      router.push("/setup/users/group");
    } catch (err) {
      toast.error(err, "Could not delete group");
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="list" />;

  if (!group) {
    return (
      <div>
        <SetupHeader
          kicker="Setup · Users"
          title="Group not found"
          copy="This group may have been deleted or the link is outdated."
          action={
            <Link href="/setup/users/group" className={secondaryButtonClass}>
              <ArrowLeft size={16} />
              Back to groups
            </Link>
          }
        />
      </div>
    );
  }

  const visual = groupVisual(group.name, 0);
  const Icon = visual.Icon;
  const isDefault = isDefaultGroupId(group.id);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/setup/users/group"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-pos-ink-muted hover:text-pos-ink"
        >
          <ArrowLeft size={15} />
          Groups
        </Link>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-pos-surface shadow-pos-md">
        <div className="border-b border-pos-border/70 px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="grid size-14 place-items-center rounded-[16px]"
                style={{ background: visual.bg, color: visual.fg }}
              >
                <Icon size={24} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-pos-ink">
                    {group.name}
                  </h1>
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-[12px] font-medium ${groupTone(group.name)}`}
                  >
                    {isDefault ? "Default" : isAdminGroup(group) ? "Administrator" : "Custom"}
                  </span>
                </div>
                <p className="mt-2 max-w-xl text-[14px] text-pos-ink-muted">
                  {roleBlurb(group.name)}
                </p>
                <p className="mt-2 text-[13px] text-pos-ink-faint">
                  {members.length} {members.length === 1 ? "member" : "members"} ·{" "}
                  {privilegeSummary(group)}
                  {isDefault ? " · Cannot be deleted" : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isDefault ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busy}
                  onClick={onDelete}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              ) : null}
              <PrimaryButton onClick={openEdit}>
                <Pencil size={15} />
                Edit privileges
              </PrimaryButton>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              Access summary
            </h2>
            <ul className="mt-3 space-y-2">
              {grantedLabels.length === 0 ? (
                <li className="rounded-2xl bg-pos-surface-muted/60 px-4 py-3 text-sm text-pos-ink-faint">
                  No sidebar menus granted yet. Edit privileges to assign access.
                </li>
              ) : (
                grantedLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-2xl bg-pos-surface-muted/60 px-4 py-3 text-sm text-pos-ink"
                  >
                    {label}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                Members
              </h2>
              <Link
                href="/setup/users/account"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-pos-primary hover:underline"
              >
                <Users size={13} />
                Accounts
              </Link>
            </div>
            {members.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-pos-border px-4 py-8 text-sm text-pos-ink-faint">
                No accounts assigned to this group yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/setup/users/account/${encodeURIComponent(member.id)}`}
                      className="flex items-center gap-3 rounded-2xl bg-pos-surface-muted/60 px-3 py-3 transition hover:bg-pos-surface-muted"
                    >
                      <PersonAvatar name={member.name} id={member.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-pos-ink">{member.name}</p>
                        <p className="truncate text-[12px] text-pos-ink-faint">{member.email}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(member.active)}`}
                      >
                        {member.active ? "Active" : "Disabled"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {draft ? (
        <GroupFormSheet
          open={sheetOpen}
          draft={draft}
          busy={busy}
          onClose={() => setSheetOpen(false)}
          onChange={setDraft}
          onSubmit={onSave}
          onDelete={isDefault ? undefined : onDelete}
        />
      ) : null}
    </div>
  );
}
