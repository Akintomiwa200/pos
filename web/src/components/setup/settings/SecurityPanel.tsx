"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  Clock3,
  KeyRound,
  Lock,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import type { ConsoleSession } from "@/lib/access";
import type { HqOrgSettings } from "@/lib/hq-setup";
import type { SettingsFieldErrors } from "@/lib/settings-validation";
import {
  clearStaffPin,
  getTenantAudit,
  getTenantLogins,
  getTenantSecurityEvents,
  getTenantSessions,
  listTillStaff,
  revokeTenantSessions,
  setStaffPin,
  type TenantAuditEntry,
  type TenantLoginEvent,
  type TenantSecurityEvent,
  type TenantSession,
  type TillStaffMember,
} from "@/lib/hq-api";
import { useAuth } from "@/components/AuthProvider";
import {
  Field,
  PrimaryButton,
  fieldClass,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { settingsFieldClass } from "@/lib/settings-validation";
import { SettingRow, SettingsCard } from "./settings-ui";

type SecurityPanelProps = {
  draft: HqOrgSettings;
  busy: boolean;
  errors: SettingsFieldErrors;
  session: ConsoleSession | null;
  granted: Set<string>;
  onChange: (next: HqOrgSettings) => void;
  onSave: () => void;
};

function when(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function tillRoleLabel(row: Pick<TillStaffMember, "role" | "roleName">) {
  return row.roleName || row.role || "cashier";
}

function pinAuthority(role: string) {
  if (role === "admin") {
    return "Admin / Super Admin PIN opens till Settings and authorises every supervisor action.";
  }
  if (role === "supervisor") {
    return "Supervisor PIN authorises discounts, refunds, overrides and reports.";
  }
  return "Cashier PIN signs in and sells; it cannot authorise supervisor actions.";
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-6 text-center text-[13px] text-pos-ink-faint sm:px-6">{children}</p>
  );
}

export function SecurityPanel({
  draft,
  busy,
  errors,
  session,
  granted,
  onChange,
  onSave,
}: SecurityPanelProps) {
  const { lockSession, updatePassword } = useAuth();
  const [pwdBusy, setPwdBusy] = useState(false);

  const [roster, setRoster] = useState<TillStaffMember[]>([]);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const [logins, setLogins] = useState<TenantLoginEvent[]>([]);
  const [sessions, setSessions] = useState<TenantSession[]>([]);
  const [audit, setAudit] = useState<TenantAuditEntry[]>([]);
  const [events, setEvents] = useState<TenantSecurityEvent[]>([]);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const ownLogin = (session?.username ?? session?.email ?? "").trim().toLowerCase();
  const currentUser =
    roster.find(
      (row) =>
        (session?.id && row.id === `web:${session.id}`) ||
        (row.username ?? "").trim().toLowerCase() === ownLogin ||
        (row.email ?? "").trim().toLowerCase() === ownLogin,
    ) ?? null;
  const pinTarget = currentUser?.id ?? "";

  const loadSecurity = useCallback(async () => {
    if (!session?.token) return;
    const [nextLogins, nextSessions, nextAudit, nextEvents] = await Promise.all([
      getTenantLogins(session.token),
      getTenantSessions(session.token),
      getTenantAudit(session.token),
      getTenantSecurityEvents(session.token),
    ]);
    setLogins(nextLogins);
    setSessions(nextSessions);
    setAudit(nextAudit);
    setEvents(nextEvents);
  }, [session?.token]);

  useEffect(() => {
    let cancelled = false;
    void loadSecurity().catch(() => undefined);
    void listTillStaff()
      .then((rows) => {
        if (cancelled) return;
        setRoster(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadSecurity]);

  async function onPinSave(event: FormEvent) {
    event.preventDefault();
    if (!session?.token || !pinTarget) return;
    const value = pin.trim();
    if (!/^\d{4,10}$/.test(value)) {
      toast.error("PIN must be 4 to 10 digits.");
      return;
    }
    if (value !== pinConfirm.trim()) {
      toast.error("The PINs do not match.");
      return;
    }
    setPinBusy(true);
    try {
      await setStaffPin(session.token, pinTarget, value);
      setPin("");
      setPinConfirm("");
      toast.success("PIN saved.");
      await loadSecurity().catch(() => undefined);
      setRoster((current) =>
        current.map((row) => (row.id === pinTarget ? { ...row, hasPin: true } : row)),
      );
    } catch (err) {
      toast.error(err, "Could not save PIN");
    } finally {
      setPinBusy(false);
    }
  }

  async function onPinClear() {
    if (!session?.token || !pinTarget) return;
    setPinBusy(true);
    try {
      await clearStaffPin(session.token, pinTarget);
      setPin("");
      setPinConfirm("");
      toast.success("PIN cleared.");
      setRoster((current) =>
        current.map((row) => (row.id === pinTarget ? { ...row, hasPin: false } : row)),
      );
    } catch (err) {
      toast.error(err, "Could not clear PIN");
    } finally {
      setPinBusy(false);
    }
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (next.length < (draft.passwordMinLength || 6)) {
      toast.error(`Password must be at least ${draft.passwordMinLength || 6} characters`);
      return;
    }
    setPwdBusy(true);
    try {
      await updatePassword(String(form.get("current") ?? ""), next);
      toast.success("Password updated.");
      event.currentTarget.reset();
      await loadSecurity().catch(() => undefined);
    } catch (err) {
      toast.error(err, "Could not update the password");
    } finally {
      setPwdBusy(false);
    }
  }

  async function onRevoke(accountId?: string) {
    if (!session?.token) return;
    setRevokeBusy(true);
    try {
      const result = await revokeTenantSessions(session.token, accountId);
      toast.success(`${result.revoked} session${result.revoked === 1 ? "" : "s"} revoked.`);
      await loadSecurity().catch(() => undefined);
    } catch (err) {
      toast.error(err, "Could not revoke sessions");
    } finally {
      setRevokeBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SettingsCard title="Signed-in account" copy="Who is using HQ right now.">
        <SettingRow
          title={session?.name || "Account"}
          description={
            session
              ? `${session.email || session.username} · ${session.groupName || "Group"}`
              : "Not signed in"
          }
          control={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-3 py-1 text-[12px] font-medium text-pos-ink-muted">
              <ShieldAlert size={12} />
              Active
            </span>
          }
        />
        <SettingRow
          title="Lock this HQ"
          description="Immediately locks the screen until you enter your account password."
          control={
            <button
              type="button"
              onClick={() => lockSession("manual_lock")}
              className={secondaryButtonClass}
            >
              <Lock size={14} />
              Lock now
            </button>
          }
        />
      </SettingsCard>

      <SettingsCard
        title="Password & session policy"
        copy="Rules for HQ passwords and the idle lock. Enforced by the API, not just this form."
      >
        <div className="grid gap-3 border-b border-pos-border/50 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <Field label="Minimum password length" error={errors.passwordMinLength}>
            <input
              className={settingsFieldClass(fieldClass, errors.passwordMinLength)}
              type="number"
              min={6}
              max={32}
              value={draft.passwordMinLength}
              aria-invalid={Boolean(errors.passwordMinLength)}
              onChange={(e) =>
                onChange({ ...draft, passwordMinLength: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Idle lock (minutes)" error={errors.sessionTimeoutMinutes}>
            <input
              className={settingsFieldClass(fieldClass, errors.sessionTimeoutMinutes)}
              type="number"
              min={0}
              value={draft.sessionTimeoutMinutes}
              aria-invalid={Boolean(errors.sessionTimeoutMinutes)}
              onChange={(e) =>
                onChange({ ...draft, sessionTimeoutMinutes: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <p className="px-5 pb-4 text-[12px] text-pos-ink-faint sm:px-6">
          0 keeps HQ unlocked until you sign out or lock it manually. Till idle lock is a separate
          register setting.
        </p>
        <div className="flex justify-end px-5 pb-5 sm:px-6">
          <PrimaryButton disabled={busy} onClick={onSave}>
            {busy ? "Saving…" : "Save policy"}
          </PrimaryButton>
        </div>
      </SettingsCard>

      <SettingsCard title="Change password" copy="Change the password for this HQ account.">
        <form className="space-y-3 px-5 py-5 sm:px-6" onSubmit={(event) => void onPassword(event)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Current password">
              <input
                className={fieldClass}
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password">
              <input
                className={fieldClass}
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={draft.passwordMinLength || 6}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                className={fieldClass}
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={draft.passwordMinLength || 6}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton type="submit" disabled={pwdBusy}>
              {pwdBusy ? "Updating…" : "Update password"}
            </PrimaryButton>
            <Link href="/password" className={`${secondaryButtonClass} !py-2`}>
              Open full page
            </Link>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard
        id="till-pin"
        title="Till PIN setup · current user"
        copy="Set or clear your own 4–10 digit till PIN. Your active HQ role controls what this PIN can authorise."
      >
        <form className="space-y-3 px-5 py-5 sm:px-6" onSubmit={(event) => void onPinSave(event)}>
          <div className="rounded-[16px] border border-pos-border bg-pos-surface-muted/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-pos-ink-faint">
              Staff member
            </p>
            {currentUser ? (
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pos-primary/10 text-[13px] font-semibold text-pos-primary">
                    {(currentUser.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-pos-ink">{currentUser.name}</p>
                    <p className="text-[12px] text-pos-ink-muted">
                      {tillRoleLabel(currentUser)} ·{" "}
                      {currentUser.source === "account" ? "HQ account" : "Company staff"}
                      {currentUser.email ? ` · ${currentUser.email}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-pos-ink-faint">
                      {pinAuthority(currentUser.role)}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                    currentUser.hasPin
                      ? "bg-pos-success/10 text-pos-success"
                      : "bg-pos-surface text-pos-ink-faint"
                  }`}
                >
                  {currentUser.hasPin ? "PIN set" : "No PIN"}
                </span>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-pos-ink">
                    {session?.name || "Signed-in user"}
                  </p>
                  <p className="text-[12px] text-pos-ink-muted">
                    {tillRoleLabel({ role: "admin", roleName: session?.groupName })} · HQ account
                    {session?.email ? ` · ${session.email}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-pos-ink-faint">
                    This account is not on the till roster yet. Refresh this page after the HQ
                    directory syncs.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New PIN">
              <input
                className={fieldClass}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="4–10 digits"
                required
              />
            </Field>
            <Field label="Confirm PIN">
              <input
                className={fieldClass}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pinConfirm}
                onChange={(event) =>
                  setPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="Repeat PIN"
                required
              />
            </Field>
          </div>
          <p className="text-[12px] text-pos-ink-faint">
            Cashier: sign-in only. Supervisor: overrides, returns, discounts and reports. Admin and
            Super Admin: Settings plus every supervisor action. Role changes are live —{" "}
            <Link className="underline" href="/setup/access">
              manage roles and privileges
            </Link>
            . Every PIN change is written to the audit trail.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton type="submit" disabled={pinBusy || !pinTarget}>
              <KeyRound size={14} />
              {pinBusy ? "Saving…" : "Save PIN"}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => void onPinClear()}
              disabled={pinBusy || !pinTarget}
              className={secondaryButtonClass}
            >
              Clear PIN
            </button>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard
        title="Active sessions"
        copy="Signed-in HQ sessions. Revoking signs the account out on that device."
      >
        <div className="divide-y divide-pos-border/50 px-5 sm:px-6">
          {sessions.length === 0 ? (
            <EmptyLine>No active sessions found.</EmptyLine>
          ) : (
            sessions.map((row) => (
              <div
                key={`${row.accountId}-${row.tokenHint}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-pos-ink">
                    {row.name}{" "}
                    {row.current ? (
                      <span className="ml-1 rounded-full bg-pos-primary/10 px-2 py-0.5 text-[11px] text-pos-primary">
                        This device
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12px] text-pos-ink-muted">
                    {row.email} · {row.tokenHint} · {when(row.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onRevoke(row.accountId)}
                  disabled={revokeBusy}
                  className="text-[13px] font-medium text-pos-danger hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </SettingsCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard
          title="Login history"
          copy="Recent successful and failed HQ sign-ins."
          action={<Activity size={16} className="text-pos-ink-faint" />}
        >
          <div className="divide-y divide-pos-border/50 px-5 sm:px-6">
            {logins.length === 0 ? (
              <EmptyLine>No login events recorded.</EmptyLine>
            ) : (
              logins.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-pos-ink">{row.email}</p>
                    <p className="text-[12px] text-pos-ink-muted">
                      {row.reason ?? (row.success ? "Signed in" : "Sign-in failed")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[12px] ${row.success ? "text-pos-success" : "text-pos-danger"}`}>
                      {row.success ? "Success" : "Failed"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-pos-ink-faint">
                      <Clock3 size={11} />
                      {when(row.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Security events"
          copy="Password resets, session revocations and other security notices."
          action={<ShieldAlert size={16} className="text-pos-ink-faint" />}
        >
          <div className="divide-y divide-pos-border/50 px-5 sm:px-6">
            {events.length === 0 ? (
              <EmptyLine>No security events recorded.</EmptyLine>
            ) : (
              events.map((row) => (
                <div key={row.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium text-pos-ink">{row.title}</p>
                    <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] text-pos-ink-muted">
                      {row.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-pos-ink-muted">{row.body ?? row.kind}</p>
                  <p className="mt-0.5 text-[11px] text-pos-ink-faint">{when(row.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </SettingsCard>
      </div>

      <SettingsCard
        title="Audit trail"
        copy="Administrative actions recorded for this account."
        action={<ScrollText size={16} className="text-pos-ink-faint" />}
      >
        <div className="divide-y divide-pos-border/50 px-5 sm:px-6">
          {audit.length === 0 ? (
            <EmptyLine>No audit entries recorded.</EmptyLine>
          ) : (
            audit.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-pos-ink">{row.action}</p>
                  <p className="text-[12px] text-pos-ink-muted">
                    {row.actor} · {row.target ?? "—"}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] text-pos-ink-faint">{when(row.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Access & permissions"
        copy="Security also depends on who can reach Settings and staff tools."
      >
        <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
          {granted.has("users-group") ? (
            <Link href="/setup/users/group" className={secondaryButtonClass}>
              <Users size={14} />
              Privilege groups
            </Link>
          ) : null}
          {granted.has("staff") ? (
            <Link href="/setup/staff" className={secondaryButtonClass}>
              Floor staff
            </Link>
          ) : null}
          {granted.has("users-account") ? (
            <Link href="/setup/users/account" className={secondaryButtonClass}>
              HQ accounts
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void loadSecurity().catch(() => undefined)}
            className={secondaryButtonClass}
          >
            <RefreshCw size={14} />
            Refresh activity
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
