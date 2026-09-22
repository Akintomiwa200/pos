"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Briefcase,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  firstAccountError,
  validateAccountDraft,
  type AccountDraft,
} from "@/lib/account-validation";
import {
  clearStaffPin,
  deleteAccount,
  listTillStaff,
  saveAccount,
  setStaffPin,
  type TillStaffMember,
} from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  fieldClass,
  secondaryButtonClass,
  selectClass,
} from "@/components/setup/SetupChrome";
import { AccountFormSheet } from "./AccountFormSheet";
import {
  PersonAvatar,
  ProfileBanner,
  groupTone,
  statusTone,
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
  const { accounts, groups, ready } = useLiveDirectory();
  const account = accounts.find((item) => item.id === accountId) ?? null;
  const [draft, setDraft] = useState<AccountDraft>(blank());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinRoster, setPinRoster] = useState<TillStaffMember[]>([]);
  const [pinTarget, setPinTarget] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinVisible, setPinVisible] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  const canManagePin =
    session?.groupId === "g-admin" ||
    (session?.username && session.username.toLowerCase() === (account?.username ?? "").toLowerCase());

  useEffect(() => {
    let cancelled = false;
    void listTillStaff()
      .then((rows) => {
        if (cancelled) return;
        setPinRoster(rows);
        const self = rows.find(
          (row) => row.username.toLowerCase() === (account?.username ?? "").toLowerCase(),
        );
        setPinTarget(self?.id ?? (rows.length > 0 ? rows[0].id : ""));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [account?.username]);

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

  async function onPinSave(event: FormEvent) {
    event.preventDefault();
    if (!session?.token || pinTarget === "") return;
    const value = pinValue.trim();
    if (!/^\d{4,10}$/.test(value)) {
      toast.error("Cashier PIN must be 4 to 10 digits.");
      return;
    }
    if (value !== pinConfirm) {
      toast.error("The PINs do not match.");
      return;
    }
    setPinBusy(true);
    try {
      await setStaffPin(session.token, pinTarget, value);
      setPinValue("");
      setPinConfirm("");
      toast.success("Cashier PIN saved.");
    } catch (err) {
      toast.error(err, "Could not save PIN");
    } finally {
      setPinBusy(false);
    }
  }

  async function onPinForget() {
    if (!session?.token || pinTarget === "") return;
    setPinBusy(true);
    try {
      await clearStaffPin(session.token, pinTarget);
      setPinValue("");
      setPinConfirm("");
      toast.success("Cashier PIN cleared.");
    } catch (err) {
      toast.error(err, "Could not clear PIN");
    } finally {
      setPinBusy(false);
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

            {canManagePin ? (
              <div className="rounded-[22px] bg-pos-surface-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pos-surface text-pos-ink-muted shadow-pos-sm">
                    <KeyRound size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] text-pos-ink-faint">POS access</p>
                    <p className="mt-0.5 font-semibold text-pos-ink">Cashier PIN</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-pos-ink-muted">
                      Set the PIN this staff member uses to sign in on the till. 4–10
                      digits. Tills pick it up on their next sync.
                    </p>
                  </div>
                </div>

                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => void onPinSave(event)}
                >
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-muted">
                      Till staff
                    </span>
                    <select
                      className={selectClass}
                      value={pinTarget}
                      onChange={(event) => setPinTarget(event.target.value)}
                      disabled={!canManagePin || pinRoster.length === 0}
                    >
                      {pinRoster.length === 0 ? (
                        <option value="">No till staff on roster</option>
                      ) : (
                        pinRoster.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name} (@{row.username})
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <div className="flex gap-2">
                    <label className="block flex-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-muted">
                        PIN
                      </span>
                      <span className="relative block">
                        <input
                          type={pinVisible ? "text" : "password"}
                          className={`${fieldClass} pr-10`}
                          value={pinValue}
                          onChange={(event) =>
                            setPinValue(
                              event.target.value.replace(/[^\d]/g, "").slice(0, 10),
                            )
                          }
                          inputMode="numeric"
                          maxLength={10}
                          placeholder={pinTarget ? "4–10 digits" : "Select staff first"}
                          disabled={!canManagePin || pinTarget === "" || pinBusy}
                          aria-label="Cashier PIN"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-pos-ink-faint hover:bg-pos-surface hover:text-pos-ink"
                          onClick={() => setPinVisible((value) => !value)}
                          aria-label={pinVisible ? "Hide PIN" : "Show PIN"}
                        >
                          {pinVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </span>
                    </label>

                    <label className="block flex-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-muted">
                        Confirm
                      </span>
                      <input
                        type={pinVisible ? "text" : "password"}
                        className={fieldClass}
                        value={pinConfirm}
                        onChange={(event) =>
                          setPinConfirm(
                            event.target.value.replace(/[^\d]/g, "").slice(0, 10),
                          )
                        }
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="Repeat PIN"
                        disabled={!canManagePin || pinTarget === "" || pinBusy}
                        aria-label="Confirm cashier PIN"
                      />
                    </label>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <PrimaryButton
                      type="submit"
                      className="flex-1"
                      disabled={!canManagePin || pinTarget === "" || pinBusy}
                    >
                      {pinBusy ? "Saving…" : "Save PIN"}
                    </PrimaryButton>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={!canManagePin || pinTarget === "" || pinBusy}
                      onClick={onPinForget}
                    >
                      Forget PIN
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
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
