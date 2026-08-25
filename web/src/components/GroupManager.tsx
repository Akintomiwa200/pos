"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  departmentsFromPrivileges,
  type ConsoleAccount,
  type ConsoleGroup,
} from "../lib/access";
import {
  listAccounts,
  listGroups,
  refreshSessionFromGroup,
  saveGroup,
} from "../lib/hq-api";
import { getCompany, type HqCompany } from "../lib/hq-setup";
import { useAuth } from "./AuthProvider";
import { ManagerSkeleton } from "./Skeleton";
import { PrimaryButton, SetupHeader, secondaryButtonClass } from "./setup/SetupChrome";
import { PersonAvatar } from "./setup/accounts/account-ui";
import { emptyGroup, GroupFormSheet } from "./setup/groups/GroupFormSheet";
import {
  groupVisual,
  isAdminGroup,
  privilegeSummary,
} from "./setup/groups/group-ui";

type AccountRow = Omit<ConsoleAccount, "password">;

function GroupCard({
  group,
  members,
  index,
}: {
  group: ConsoleGroup;
  members: number;
  index: number;
}) {
  const visual = groupVisual(group.name, index);
  const Icon = visual.Icon;
  const deptCount = group.departments.includes("*")
    ? "All departments"
    : privilegeSummary(group);

  return (
    <Link
      href={`/setup/users/group/${encodeURIComponent(group.id)}`}
      className="flex min-h-[148px] flex-col rounded-[18px] border border-pos-border bg-pos-surface p-5 text-left transition hover:border-pos-primary/25 hover:shadow-pos-md"
    >
      <span
        className="grid size-10 place-items-center rounded-[12px]"
        style={{ background: visual.bg, color: visual.fg }}
      >
        <Icon size={18} />
      </span>
      <p className="mt-4 text-[16px] font-semibold tracking-tight text-pos-ink">{group.name}</p>
      <p className="mt-1 text-[13px] text-pos-ink-faint">
        {members} {members === 1 ? "member" : "members"} · {deptCount}
      </p>
    </Link>
  );
}

export function GroupManager() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const [groups, setGroups] = useState<ConsoleGroup[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [company, setCompany] = useState<HqCompany | null>(null);
  const [draft, setDraft] = useState<ConsoleGroup>(emptyGroup());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"overview" | "teams">("overview");

  async function load() {
    const [groupRows, accountRows, companyRow] = await Promise.all([
      listGroups(),
      listAccounts().catch(() => [] as AccountRow[]),
      getCompany().catch(() => null),
    ]);
    setGroups(groupRows);
    setAccounts(accountRows);
    setCompany(companyRow);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load groups");
      setReady(true);
    });
  }, []);

  const memberCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of groups) map.set(group.id, 0);
    for (const account of accounts) {
      map.set(account.groupId, (map.get(account.groupId) ?? 0) + 1);
    }
    return map;
  }, [accounts, groups]);

  const yourGroups = useMemo(() => {
    if (!session?.groupId) return groups.filter(isAdminGroup).slice(0, 1);
    const mine = groups.find((group) => group.id === session.groupId);
    return mine ? [mine] : groups.slice(0, 1);
  }, [groups, session?.groupId]);

  const otherGroups = useMemo(
    () => groups.filter((group) => !yourGroups.some((mine) => mine.id === group.id)),
    [groups, yourGroups],
  );

  const admins = useMemo(() => {
    const adminIds = new Set(groups.filter(isAdminGroup).map((group) => group.id));
    return accounts.filter((account) => adminIds.has(account.groupId) && account.active);
  }, [accounts, groups]);

  function openNew() {
    setDraft(emptyGroup());
    setSheetOpen(true);
  }

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error("Group name is required.");
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
          : departmentsFromPrivileges(privileges),
      });
      await load();
      setSheetOpen(false);
      if (session) setSession(refreshSessionFromGroup(session, saved));
      toast.success("Group created.");
      router.push(`/setup/users/group/${encodeURIComponent(saved.id)}`);
    } catch (err) {
      toast.error(err, "Could not save group");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="groups" />;

  const orgName = company?.name || "Your company";
  const orgHandle = `@${(company?.name || "hq")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18) || "hq"}`;

  return (
    <div>
      <SetupHeader
        kicker="Setup · Users"
        title="Groups"
        copy="Open a group card for members and access details. Edit privileges from the group page."
        action={
          <PrimaryButton onClick={openNew}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New group
            </span>
          </PrimaryButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-full bg-pos-surface-muted/80 p-1">
            {(
              [
                ["overview", "Overview"],
                ["teams", "Your teams"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  tab === id
                    ? "bg-pos-surface font-semibold text-pos-ink shadow-pos-sm"
                    : "text-pos-ink-muted hover:text-pos-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 text-[13px] font-medium text-pos-ink-faint">Your groups</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {yourGroups.length === 0 ? (
                    <button
                      type="button"
                      onClick={openNew}
                      className="flex min-h-[148px] flex-col items-start justify-center rounded-[18px] border border-dashed border-pos-border bg-pos-surface p-5 text-left text-sm text-pos-ink-muted hover:border-pos-primary/40 hover:text-pos-ink"
                    >
                      <span className="grid size-10 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-faint">
                        <Plus size={18} />
                      </span>
                      <p className="mt-4 font-medium">Create your first group</p>
                    </button>
                  ) : (
                    yourGroups.map((group, index) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        members={memberCount.get(group.id) ?? 0}
                        index={index}
                      />
                    ))
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-[13px] font-medium text-pos-ink-faint">Other groups</h2>
                {otherGroups.length === 0 ? (
                  <p className="rounded-[18px] border border-dashed border-pos-border px-4 py-8 text-sm text-pos-ink-faint">
                    No other groups yet.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {otherGroups.map((group, index) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        members={memberCount.get(group.id) ?? 0}
                        index={index + yourGroups.length}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((group, index) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  members={memberCount.get(group.id) ?? 0}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[24px] bg-pos-surface-muted/70 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-pos-primary text-white shadow-pos-primary">
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-pos-ink">{orgName}</p>
              <p className="truncate text-[13px] text-pos-primary">{orgHandle}</p>
              <p className="mt-1 text-[12px] text-pos-ink-faint">
                {accounts.length} {accounts.length === 1 ? "member" : "members"} · {groups.length}{" "}
                user {groups.length === 1 ? "group" : "groups"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-pos-ink">User groups</h3>
              <button
                type="button"
                onClick={openNew}
                className="grid size-7 place-items-center rounded-full text-pos-ink-muted hover:bg-pos-surface hover:text-pos-ink"
                aria-label="New group"
              >
                <Plus size={16} />
              </button>
            </div>
            <ul className="space-y-2">
              {groups.slice(0, 7).map((group, index) => {
                const visual = groupVisual(group.name, index);
                const Icon = visual.Icon;
                return (
                  <li key={group.id}>
                    <Link
                      href={`/setup/users/group/${encodeURIComponent(group.id)}`}
                      className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-pos-surface"
                    >
                      <span
                        className="grid size-7 shrink-0 place-items-center rounded-lg"
                        style={{ background: visual.bg, color: visual.fg }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-pos-ink">
                        {group.name}
                      </span>
                      <span className="text-[11px] text-pos-ink-faint">
                        {memberCount.get(group.id) ?? 0}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {groups.length > 7 ? (
              <button
                type="button"
                onClick={() => setTab("teams")}
                className="mt-2 text-[13px] font-medium text-pos-primary hover:underline"
              >
                See all
              </button>
            ) : null}
          </div>

          <div className="mt-7">
            <h3 className="mb-3 text-[13px] font-semibold text-pos-ink">Admins</h3>
            {admins.length === 0 ? (
              <p className="text-[13px] text-pos-ink-faint">No administrator accounts yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {admins.slice(0, 4).map((admin) => (
                  <li key={admin.id} className="flex items-center gap-3">
                    <PersonAvatar name={admin.name} id={admin.id} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-pos-ink">{admin.name}</p>
                      <p className="truncate text-[11px] text-pos-ink-faint">@{admin.username}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/setup/users/account"
              className={`${secondaryButtonClass} mt-3 w-full`}
            >
              <Users size={14} />
              Manage accounts
            </Link>
          </div>
        </aside>
      </div>

      <GroupFormSheet
        open={sheetOpen}
        draft={draft}
        busy={busy}
        onClose={() => setSheetOpen(false)}
        onChange={setDraft}
        onSubmit={onSave}
      />
    </div>
  );
}
