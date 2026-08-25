"use client";

import Link from "next/link";
import {
  Bell,
  Database,
  Download,
  KeyRound,
  Shield,
  ShoppingCart,
  Users,
  MonitorSmartphone,
} from "lucide-react";
import type { HqOrgSettings } from "@/lib/hq-setup";
import { settingsFieldClass, type SettingsFieldErrors } from "@/lib/settings-validation";
import {
  Field,
  PrimaryButton,
  fieldClass,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { SettingRow, SettingsCard, Switch } from "./settings-ui";

export function NotificationsPanel({
  draft,
  busy,
  onToggle,
}: {
  draft: HqOrgSettings;
  busy: boolean;
  onToggle: (key: keyof HqOrgSettings, value: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        title="Orders & stock"
        copy="HQ alerts for store activity. Shown in the notification bell when events fire."
      >
        <SettingRow
          title="Low stock warnings"
          description="When items hit the low-stock quantity."
          control={
            <Switch
              checked={draft.notifyLowStock}
              disabled={busy}
              onChange={(v) => onToggle("notifyLowStock", v)}
            />
          }
        />
        <SettingRow
          title="New sales"
          description="Ping HQ when a till completes a sale."
          control={
            <Switch
              checked={draft.notifyNewSale}
              disabled={busy}
              onChange={(v) => onToggle("notifyNewSale", v)}
            />
          }
        />
        <SettingRow
          title="Refunds"
          description="Alert when a refund is posted from any till."
          control={
            <Switch
              checked={draft.notifyRefund}
              disabled={busy}
              onChange={(v) => onToggle("notifyRefund", v)}
            />
          }
        />
      </SettingsCard>
      <SettingsCard title="Shifts & reports" copy="End-of-day and shift lifecycle.">
        <SettingRow
          title="Shift closed"
          description="When a cashier closes their shift."
          control={
            <Switch
              checked={draft.notifyShiftClose}
              disabled={busy}
              onChange={(v) => onToggle("notifyShiftClose", v)}
            />
          }
        />
        <SettingRow
          title="Daily summary"
          description="Morning digest of yesterday’s sales (when email is configured)."
          control={
            <Switch
              checked={draft.notifyDailySummary}
              disabled={busy}
              onChange={(v) => onToggle("notifyDailySummary", v)}
            />
          }
        />
      </SettingsCard>
      <p className="flex items-center gap-2 text-sm text-pos-ink-muted">
        <Bell size={14} />
        SMTP must be set on the API for email digests; otherwise alerts stay in HQ only.
      </p>
    </div>
  );
}

export function SalesPanel({
  draft,
  busy,
  errors = {},
  onChange,
  onToggle,
  onSave,
}: {
  draft: HqOrgSettings;
  busy: boolean;
  errors?: SettingsFieldErrors;
  onChange: (next: HqOrgSettings) => void;
  onToggle: (key: keyof HqOrgSettings, value: boolean) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        title="Pricing & discounts"
        copy="What cashiers can change on the till. Syncs to registers on heartbeat."
      >
        <SettingRow
          title="Allow price override"
          description="Cashiers can edit unit price before checkout."
          control={
            <Switch
              checked={draft.allowPriceOverride}
              disabled={busy}
              onChange={(v) => onToggle("allowPriceOverride", v)}
            />
          }
        />
        <SettingRow
          title="Allow discounts"
          description="Line or ticket discounts on the register."
          control={
            <Switch
              checked={draft.allowDiscounts}
              disabled={busy}
              onChange={(v) => onToggle("allowDiscounts", v)}
            />
          }
        />
        <div className="border-t border-pos-border/50 px-5 py-4 sm:px-6">
          <Field label="Max discount %" error={errors.maxDiscountPercent}>
            <input
              className={settingsFieldClass(fieldClass, errors.maxDiscountPercent)}
              type="number"
              min={0}
              max={100}
              value={draft.maxDiscountPercent}
              disabled={!draft.allowDiscounts}
              aria-invalid={Boolean(errors.maxDiscountPercent)}
              onChange={(e) =>
                onChange({ ...draft, maxDiscountPercent: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <SettingRow
          title="Tips / service prompt"
          description="Offer tip capture at payment on restaurant tills."
          control={
            <Switch
              checked={draft.tipsEnabled}
              disabled={busy}
              onChange={(v) => onToggle("tipsEnabled", v)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Refunds" copy="Controls after a sale is completed.">
        <SettingRow
          title="Require manager PIN"
          description="Sensitive actions need a manager unlock."
          control={
            <Switch
              checked={draft.requireManagerPin}
              disabled={busy}
              onChange={(v) => onToggle("requireManagerPin", v)}
            />
          }
        />
        <SettingRow
          title="Allow partial refunds"
          description="Refund selected lines instead of the whole ticket."
          control={
            <Switch
              checked={draft.allowPartialRefunds}
              disabled={busy}
              onChange={(v) => onToggle("allowPartialRefunds", v)}
            />
          }
        />
        <SettingRow
          title="Restock on refund"
          description="Return quantity to inventory when refunded."
          control={
            <Switch
              checked={draft.restockOnRefund}
              disabled={busy}
              onChange={(v) => onToggle("restockOnRefund", v)}
            />
          }
        />
        <SettingRow
          title="Refund without ticket"
          description="Allow blind refunds when the original receipt is missing."
          control={
            <Switch
              checked={draft.refundWithoutTicket}
              disabled={busy}
              onChange={(v) => onToggle("refundWithoutTicket", v)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Holds & printing" copy="Parked tickets and receipt hardware.">
        <div className="grid gap-3 border-b border-pos-border/50 px-5 py-4 sm:grid-cols-2 sm:px-6">
          <Field label="Hold expiry (minutes)" error={errors.holdExpiryMinutes}>
            <input
              className={settingsFieldClass(fieldClass, errors.holdExpiryMinutes)}
              type="number"
              min={0}
              value={draft.holdExpiryMinutes}
              aria-invalid={Boolean(errors.holdExpiryMinutes)}
              onChange={(e) =>
                onChange({ ...draft, holdExpiryMinutes: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Receipt copies" error={errors.receiptCopies}>
            <input
              className={settingsFieldClass(fieldClass, errors.receiptCopies)}
              type="number"
              min={1}
              max={5}
              value={draft.receiptCopies}
              aria-invalid={Boolean(errors.receiptCopies)}
              onChange={(e) =>
                onChange({ ...draft, receiptCopies: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <SettingRow
          title="Auto-print receipt"
          description="Print immediately after a successful payment."
          control={
            <Switch
              checked={draft.autoPrintReceipt}
              disabled={busy}
              onChange={(v) => onToggle("autoPrintReceipt", v)}
            />
          }
        />
        <SettingRow
          title="Open cash drawer"
          description="Pulse the drawer on cash tenders."
          control={
            <Switch
              checked={draft.openCashDrawer}
              disabled={busy}
              onChange={(v) => onToggle("openCashDrawer", v)}
            />
          }
        />
      </SettingsCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/setup/others/till"
          className="inline-flex items-center gap-2 text-sm font-medium text-pos-primary hover:underline"
        >
          <MonitorSmartphone size={14} />
          Manage tills
        </Link>
        <PrimaryButton
          disabled={
            busy ||
            Boolean(
              errors.maxDiscountPercent || errors.holdExpiryMinutes || errors.receiptCopies,
            )
          }
          onClick={onSave}
        >
          {busy ? "Saving…" : "Save sales rules"}
        </PrimaryButton>
      </div>
    </div>
  );
}

export function PeoplePanel() {
  return (
    <div className="space-y-5">
      <SettingsCard
        title="HQ users"
        copy="Accounts and privilege groups control who can open Settings and Organization."
      >
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:px-6">
          <Link
            href="/setup/users/account"
            className="flex items-center gap-3 rounded-[18px] bg-pos-surface-muted px-4 py-4 transition hover:bg-pos-primary/10"
          >
            <span className="grid size-10 place-items-center rounded-full bg-pos-surface text-pos-ink-muted">
              <Users size={18} />
            </span>
            <span>
              <span className="block font-semibold text-pos-ink">Accounts</span>
              <span className="block text-[13px] text-pos-ink-muted">
                Create and edit HQ logins
              </span>
            </span>
          </Link>
          <Link
            href="/setup/users/group"
            className="flex items-center gap-3 rounded-[18px] bg-pos-surface-muted px-4 py-4 transition hover:bg-pos-primary/10"
          >
            <span className="grid size-10 place-items-center rounded-full bg-pos-surface text-pos-ink-muted">
              <Shield size={18} />
            </span>
            <span>
              <span className="block font-semibold text-pos-ink">Groups</span>
              <span className="block text-[13px] text-pos-ink-muted">
                Privileges and sidebar access
              </span>
            </span>
          </Link>
        </div>
      </SettingsCard>
      <SettingsCard title="Also related" copy="Staff on the till floor and password changes.">
        <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
          <Link href="/setup/staff" className={secondaryButtonClass}>
            Floor staff
          </Link>
          <Link href="/setup/others/settings?section=security" className={secondaryButtonClass}>
            <KeyRound size={14} />
            Security & password
          </Link>
        </div>
      </SettingsCard>
    </div>
  );
}

export function DataPanel({
  onExport,
}: {
  onExport: (kind: "org" | "catalog" | "sales" | "all") => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        title="Backup & export"
        copy="Download company data for safekeeping or migration."
      >
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:px-6">
          {(
            [
              { kind: "org" as const, label: "Organization", hint: "Company, branches, settings" },
              { kind: "catalog" as const, label: "Catalog", hint: "Products and prices" },
              { kind: "sales" as const, label: "Sales", hint: "Ticket history" },
              { kind: "all" as const, label: "Full backup", hint: "Everything above" },
            ] as const
          ).map((row) => (
            <button
              key={row.kind}
              type="button"
              onClick={() => onExport(row.kind)}
              className="flex items-center gap-3 rounded-[18px] bg-pos-surface-muted px-4 py-4 text-left transition hover:bg-pos-primary/10"
            >
              <span className="grid size-10 place-items-center rounded-full bg-pos-surface text-pos-ink-muted">
                <Download size={18} />
              </span>
              <span>
                <span className="block font-semibold text-pos-ink">{row.label}</span>
                <span className="block text-[13px] text-pos-ink-muted">{row.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </SettingsCard>
      <SettingsCard title="Maintenance" copy="Inspect counts or reset demo catalog.">
        <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
          <Link href="/setup/others/data" className={secondaryButtonClass}>
            <Database size={14} />
            Data overview
          </Link>
          <Link href="/setup/others/export" className={secondaryButtonClass}>
            Export centre
          </Link>
          <Link href="/setup/items/import" className={secondaryButtonClass}>
            Import products
          </Link>
        </div>
      </SettingsCard>
      <p className="flex items-center gap-2 text-sm text-pos-ink-muted">
        <ShoppingCart size={14} />
        Catalog reset is available under Data overview — it does not wipe sales or tills.
      </p>
    </div>
  );
}
