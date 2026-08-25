"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Briefcase,
  Mail,
  Pencil,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "@/lib/toast";
import type { ConsoleGroup } from "@/lib/access";
import {
  firstAccountError,
  validateAccountDraft,
  type AccountDraft,
} from "@/lib/account-validation";
import { deleteAccount, listAccounts, listGroups, saveAccount } from "@/lib/hq-api";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { AccountFormSheet } from "./AccountFormSheet";
import {
  PersonAvatar,
  ProfileBanner,
  groupTone,
  statusTone,
  type AccountRow,
} from "./account-ui";

const blank = (groupId = ""): AccountDraft => ({
  id: "",
  name: "",
  email: "",
  username: "",
  password: "",
  groupId,
  active: true,
});

export function AccountProfile({ accountId }: { accountId: string }) {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [groups, setGroups] = useState<ConsoleGroup[]>([]);
  const [draft, setDraft] = useState<AccountDraft>(blank());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [rows, groupRows] = await Promise.all([listAccounts(), listGroups()]);
    setGroups(groupRows);
    const row = rows.find((item) => item.id === accountId) ?? null;
    setAccount(row);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load account");
      setReady(true);
    });
  }, [accountId]);

  const group = account
    ? groups.find((row) => row.id === account.groupId)
    : undefined;

  function openEdit() {
    if (!account) return;
    setDraft({ ...account, password: "" });
    setSheetOpen(true);
  }

  async function onSave() {
    const nextErrors = validateAccountDraft(draft);
    const message = firstAccountError(nextErrors);
    if (message) {
      toast.error(message);
      return;
    }

    setBusy(true);
    try {
      const saved = await saveAccount({
        ...draft,
        id: draft.id || undefined,
        password: draft.password.trim() || undefined,
      });
      if (session && saved.id === session.id) {
        const nextGroup = groups.find((row) => row.id === saved.groupId);
        if (nextGroup) {
          setSession({
            ...session,
            name: saved.name,
            email: saved.email,
            username: saved.username,
            groupId: saved.groupId,
            groupName: nextGroup.name,
            departments: nextGroup.departments,
            privileges: nextGroup.privileges,
          });
        }
      }
      await load();
      setSheetOpen(false);
      toast.success("Account saved.");
    } catch (err) {
      toast.error(err, "Could not save account");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!draft.id) return;
    setBusy(true);
    try {
      await deleteAccount(draft.id);
      toast.success("Account deleted.");
      router.push("/setup/users/account");
    } catch (err) {
      toast.error(err, "Could not delete account");
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="list" />;

  if (!account) {
    return (
      <div>
        <SetupHeader
          kicker="Setup · Users"
          title="Account not found"
          copy="This person may have been deleted or the link is outdated."
          action={
            <Link href="/setup/users/account" className={secondaryButtonClass}>
              <ArrowLeft size={16} />
              Back to accounts
            </Link>
          }
        />
      </div>
    );
  }

  const groupName = group?.name ?? account.groupId;
  const departments =
    !group || group.departments.includes("*")
      ? ["All departments"]
      : group.departments;
  const privilegeCount =
    !group || group.privileges.includes("*")
      ? "Full access"
      : `${group.privileges.length} privileges`;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/setup/users/account"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-pos-ink-muted hover:text-pos-ink"
        >
          <ArrowLeft size={15} />
          Accounts
        </Link>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-pos-surface shadow-pos-md">
        <ProfileBanner>
          <div className="h-36 sm:h-44" />
        </ProfileBanner>

        <div className="relative px-5 pb-6 pt-0 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <PersonAvatar name={account.name} id={account.id} size={96} />
            <div className="flex flex-wrap gap-2 sm:pb-1">
              <a href={`mailto:${account.email}`} className={secondaryButtonClass}>
                <Mail size={15} />
                Email
              </a>
              <PrimaryButton onClick={openEdit}>
                <Pencil size={15} />
                Edit account
              </PrimaryButton>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-pos-ink">
                {account.name}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(account.active)}`}
              >
                {account.active ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="mt-1 text-[14px] text-pos-ink-muted">
              {groupName} · @{account.username}
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                Profile
              </h2>
              <dl className="divide-y divide-pos-border/60 rounded-[22px] bg-pos-surface-muted/50">
                <DetailRow
                  icon={<UserRound size={16} />}
                  label="Full name"
                  value={account.name}
                />
                <DetailRow
                  icon={<AtSign size={16} />}
                  label="Username"
                  value={`@${account.username}`}
                />
                <DetailRow
                  icon={<Mail size={16} />}
                  label="Email"
                  value={
                    <a
                      href={`mailto:${account.email}`}
                      className="text-pos-primary hover:underline"
                    >
                      {account.email}
                    </a>
                  }
                />
                <DetailRow
                  icon={<Shield size={16} />}
                  label="Status"
                  value={account.active ? "Active" : "Disabled"}
                />
              </dl>
            </div>

            <div className="space-y-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                Access
              </h2>
              <div className="rounded-[22px] bg-pos-surface-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-pos-surface text-pos-ink-muted shadow-pos-sm">
                    <Briefcase size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] text-pos-ink-faint">Group</p>
                    <p className="mt-0.5 font-semibold text-pos-ink">{groupName}</p>
                    <span
                      className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[12px] font-medium ${groupTone(groupName)}`}
                    >
                      {privilegeCount}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[12px] text-pos-ink-faint">Departments</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {departments.map((dept) => (
                      <span
                        key={dept}
                        className="rounded-lg border border-pos-border bg-pos-surface px-2.5 py-1 text-[12px] text-pos-ink-muted"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-[13px] leading-relaxed text-pos-ink-muted">
                  Sidebar menus for this person come from the group&apos;s departments
                  and privileges. Change the group to update what they can open.
                </p>

                <Link
                  href="/setup/users/group"
                  className="mt-4 inline-flex text-[13px] font-medium text-pos-primary hover:underline"
                >
                  Manage groups
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AccountFormSheet
        open={sheetOpen}
        draft={draft}
        groups={groups}
        busy={busy}
        onClose={() => setSheetOpen(false)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSubmit={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center text-pos-ink-faint">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[12px] text-pos-ink-faint">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-pos-ink">{value}</dd>
      </div>
    </div>
  );
}
