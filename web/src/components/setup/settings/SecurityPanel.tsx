"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  Clock3,
  KeyRound,
  Lock,
  Plus,
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
import { saveDirectory } from "@/lib/hq-directory";
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
  const [pinTarget, setPinTarget] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("cashier");
  const [addBusy, setAddBusy] = useState(false);

  const [logins, setLogins] = useState<TenantLoginEvent[]>([]);
  const [sessions, setSessions] = useState<TenantSession[]>([]);
  const [audit, setAudit] = useState<TenantAuditEntry[]>([]);
  const [events, setEvents] = useState<TenantSecurityEvent[]>([]);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const selectedStaff = roster.find((row) => row.id === pinTarget) ?? null;

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
        const self = rows.find(
          (row) => row.username.toLowerCase() === (session?.username ?? "").toLowerCase(),
        );
        setPinTarget(self?.id ?? rows[0]?.id ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadSecurity, session?.username]);

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

  async function addStaff(event: FormEvent) {
    event.preventDefault();
    const name = newStaffName.trim();
    if (!name) return;
    setAddBusy(true);
    try {
      const created = await saveDirectory("staff", {
        name,
        active: true,
        extra: { tillRole: newStaffRole },
      });
      const rows = await listTillStaff();
      setRoster(rows);
      setPinTarget(created.id);
      setNewStaffName("");
      toast.success(`${name} added to company staff.`);
    } catch (err) {
      toast.error(err, "Could not add staff");
    } finally {
      setAddBusy(false);
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
        title="Till PIN setup · all roles"
        copy="Set or clear the 4–10 digit PIN for cashiers, supervisors and admins. It signs the operator in and authorises the actions their role allows."
      >
        <form className="space-y-3 px-5 py-5 sm:px-6" onSubmit={(event) => void onPinSave(event)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Staff member">
              <select
                className={fieldClass}
                value={pinTarget}
                onChange={(event) => setPinTarget(event.target.value)}
                required
              >
                <option value="">Select staff</option>
                {roster.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.role || "cashier"}
                    {row.hasPin ? " · PIN set" : ""}
                  </option>
                ))}
              </select>
              {roster.length === 0 ? (
                <p className="text-[12px] text-pos-ink-faint">
                  No company staff yet. Add one below or manage staff in{" "}
                  <Link className="underline" href="/setup/staff">
                    Setup › Staff
                  </Link>
                  .
                </p>
              ) : null}
            </Field>
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
          {selectedStaff ? (
            <div className="rounded-[14px] bg-pos-surface-muted px-4 py-3 text-[12px] text-pos-ink-muted">
              <span className="font-semibold text-pos-ink">{selectedStaff.name}</span> ·{" "}
              {selectedStaff.role || "cashier"} ·{" "}
              {selectedStaff.privileges?.length
                ? selectedStaff.privileges.join(", ")
                : "sell"}
              <p className="mt-1 text-pos-ink-faint">
                {selectedStaff.role === "admin"
                  ? "Admin PIN opens till Settings and authorises every supervisor action."
                  : selectedStaff.role === "supervisor"
                    ? "Supervisor PIN authorises discounts, refunds, overrides and reports."
                    : "Cashier PIN signs in and sells; it cannot authorise supervisor actions."}
              </p>
            </div>
          ) : null}
          <p className="text-[12px] text-pos-ink-faint">
            Only an administrator or the staff member themselves can change a PIN. Clearing a PIN
            removes PIN sign-in for that operator. Every change is written to the audit trail.
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
        <form
          className="flex flex-wrap items-end gap-3 border-t border-pos-border/60 px-5 py-5 sm:px-6"
          onSubmit={(event) => void addStaff(event)}
        >
          <Field label="Add company staff">
            <input
              className={fieldClass}
              value={newStaffName}
              onChange={(event) => setNewStaffName(event.target.value)}
              placeholder="Full name"
              required
            />
          </Field>
          <Field label="Till access">
            <select
              className={fieldClass}
              value={newStaffRole}
              onChange={(event) => setNewStaffRole(event.target.value)}
            >
              <option value="cashier">Cashier</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager / Admin</option>
            </select>
          </Field>
          <PrimaryButton type="submit" disabled={addBusy || !newStaffName.trim()}>
            <Plus size={14} />
            {addBusy ? "Adding…" : "Add staff"}
          </PrimaryButton>
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
