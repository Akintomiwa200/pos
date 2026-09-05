"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  CreditCard,
  Database,
  FileText,
  Globe,
  HelpCircle,
  Lock,
  MapPin,
  Package,
  Percent,
  Palette,
  Receipt,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Users,
  MonitorSmartphone,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { exportSetup, type HqOrgSettings } from "@/lib/hq-setup";
import { useLiveOrgSettings } from "@/lib/settings-live";
import {
  firstSettingsError,
  settingsFieldClass,
  validateOrgSettings,
  type SettingsFieldErrors,
} from "@/lib/settings-validation";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  allowedSettingsSections,
  grantedPrivileges,
  type SettingsSectionId,
} from "@/lib/settings-access";
import {
  CURRENCIES,
  LANGUAGES,
  listTimezones,
  localeFromCurrency,
  localeFromLanguage,
  localeFromTimezone,
  withCurrent,
  withCurrentValue,
} from "@/lib/locale";
import {
  Field,
  FormSelect,
  PrimaryButton,
  SetupHeader,
  fieldClass,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import {
  DataPanel,
  NotificationsPanel,
  PeoplePanel,
  SalesPanel,
} from "./settings/AdminPanels";
import { AppearanceStudio } from "./settings/AppearanceStudio";
import { InvoiceStudio } from "./settings/InvoiceStudio";
import {
  ReceiptStudio,
  SettingRow,
  SettingsCard,
  Switch,
} from "./settings/settings-ui";

const SECTIONS: {
  id: SettingsSectionId;
  label: string;
  icon: typeof Globe;
}[] = [
  { id: "general", label: "General", icon: Globe },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "register", label: "Register", icon: MonitorSmartphone },
  { id: "sales", label: "Sales rules", icon: ShoppingCart },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "people", label: "People", icon: Users },
  { id: "data", label: "Data", icon: Database },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
  { id: "security", label: "Security", icon: Lock },
  { id: "organization", label: "Organization", icon: Building2 },
];

const ORG_LINKS = [
  {
    href: "/setup/others/company",
    label: "Company",
    hint: "Legal name, contact, currency",
    icon: Building2,
    req: "others-company",
  },
  {
    href: "/setup/others/branch",
    label: "Branches",
    hint: "Physical locations",
    icon: MapPin,
    req: "others-branch",
  },
  {
    href: "/setup/others/store",
    label: "Stores",
    hint: "Retail floors and warehouses",
    icon: Store,
    req: "others-store",
  },
  {
    href: "/setup/others/storefront",
    label: "Storefronts",
    hint: "Online shops",
    icon: Globe,
    req: "others-storefront",
  },
  {
    href: "/setup/others/payment-gateway",
    label: "Payment gateways",
    hint: "Paystack, bank, cash rails",
    icon: CreditCard,
    req: "others-payment-gateway",
  },
  {
    href: "/setup/others/tax",
    label: "Tax",
    hint: "VAT and service charge",
    icon: Percent,
    req: "others-tax",
  },
] as const;

function isSection(value: string | null): value is SettingsSectionId {
  return SECTIONS.some((section) => section.id === value);
}

export function SettingsManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, updatePassword } = useAuth();
  const {
    ready,
    saving: busy,
    settings: draft,
    company,
    patch,
    replace,
    flush,
    setSettingsLocal,
  } = useLiveOrgSettings();

  const sectionParam = searchParams.get("section");
  const granted = grantedPrivileges(session);
  const allowed = allowedSettingsSections(session);
  const requested = isSection(sectionParam) ? sectionParam : null;
  const active: SettingsSectionId =
    requested && allowed.includes(requested) ? requested : (allowed[0] ?? "general");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [errors, setErrors] = useState<SettingsFieldErrors>({});

  function go(section: SettingsSectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyDraft(next: HqOrgSettings, opts?: { persist?: boolean }) {
    const nextErrors = validateOrgSettings(next);
    setErrors(nextErrors);
    setSettingsLocal(next);
    if (firstSettingsError(nextErrors)) return;
    if (opts?.persist === false) return;
    void replace(next).catch((err) => toast.error(err, "Could not save settings"));
  }

  function applyPatch(partial: Partial<HqOrgSettings>) {
    if (!draft) return;
    const next = { ...draft, ...partial };
    const nextErrors = validateOrgSettings(next);
    setErrors(nextErrors);
    setSettingsLocal(next);

    // Only block API write for errors on fields in this patch (keeps header/footer live).
    const blocked = (Object.keys(partial) as (keyof HqOrgSettings)[]).some(
      (key) => Boolean(nextErrors[key]),
    );
    if (blocked) return;

    void patch(partial).catch((err) => toast.error(err, "Could not save settings"));
  }

  async function persist(next: HqOrgSettings, silent = false) {
    const nextErrors = validateOrgSettings(next);
    setErrors(nextErrors);
    const message = firstSettingsError(nextErrors);
    if (message) {
      toast.error(message);
      setSettingsLocal(next);
      return;
    }
    try {
      await replace(next);
      await flush();
      if (!silent) toast.success("Settings saved.");
    } catch (err) {
      toast.error(err, "Could not save settings");
    }
  }

  function onLiveChange(next: HqOrgSettings) {
    applyDraft(next);
  }

  async function toggle(key: keyof HqOrgSettings, value: boolean) {
    if (!draft) return;
    const next = { ...draft, [key]: value };
    const nextErrors = validateOrgSettings(next);
    setErrors(nextErrors);
    if (firstSettingsError(nextErrors)) {
      setSettingsLocal(next);
      toast.error(firstSettingsError(nextErrors)!);
      return;
    }
    try {
      await patch({ [key]: value } as Partial<HqOrgSettings>);
    } catch (err) {
      toast.error(err, "Could not save settings");
    }
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < (draft?.passwordMinLength ?? 6)) {
      toast.error(`Password must be at least ${draft?.passwordMinLength ?? 6} characters`);
      return;
    }
    setPwdBusy(true);
    try {
      await updatePassword(String(form.get("current") ?? ""), password);
      toast.success("Password updated.");
      event.currentTarget.reset();
    } catch (err) {
      toast.error(err, "Could not update the password");
    } finally {
      setPwdBusy(false);
    }
  }

  async function onExport(kind: "org" | "catalog" | "sales" | "all") {
    try {
      const data = await exportSetup(kind);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-${kind}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (err) {
      toast.error(err, "Could not export");
    }
  }

  if (!ready) return <ManagerSkeleton variant="list" />;
  if (!draft) {
    return (
      <div>
        <SetupHeader
          kicker="Setup · Settings"
          title="Settings"
          copy="HQ API is not reachable. Start the backend, then refresh."
        />
      </div>
    );
  }

  if (!allowed.length) {
    return (
      <div>
        <SetupHeader
          kicker="Setup · Settings"
          title="Settings"
          copy="No settings sections are assigned to your group. Ask an administrator who can edit groups to grant the pages you need."
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <SetupHeader
        kicker="Setup · Settings"
        title="Settings"
        copy="Live HQ settings — receipts, invoices, and appearance sync in real time."
      />

      <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[22px] bg-pos-surface p-2.5 shadow-pos-sm xl:sticky xl:top-4">
          <nav className="flex flex-col gap-0.5" aria-label="Settings sections">
            {SECTIONS.filter(({ id }) => allowed.includes(id)).map(({ id, label, icon: Icon }) => {
              const on = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] transition ${
                    on
                      ? "bg-pos-primary/12 font-semibold text-pos-primary"
                      : "text-pos-ink-muted hover:bg-pos-surface-muted hover:text-pos-ink"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} className={on ? "text-pos-primary" : ""} />
                  {label}
                </button>
              );
            })}
            <Link
              href="/help"
              className="mt-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-ink"
            >
              <HelpCircle size={18} strokeWidth={1.75} />
              Help
            </Link>
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {active === "general" ? (
            <>
              <SettingsCard
                title="Locale & currency"
                copy="Pick timezone, language, or currency — the other two update to match in real time."
              >
                <div className="grid min-w-0 gap-4 px-5 py-5 sm:grid-cols-3 sm:px-6 [&>*]:min-w-0">
                  <Field label="Timezone" error={errors.timezone}>
                    <FormSelect
                      className={settingsFieldClass("", errors.timezone)}
                      value={draft.timezone}
                      aria-invalid={Boolean(errors.timezone)}
                      onChange={(e) =>
                        onLiveChange({
                          ...draft,
                          ...localeFromTimezone(e.target.value, draft),
                        })
                      }
                    >
                      {withCurrentValue(listTimezones(), draft.timezone).map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </FormSelect>
                  </Field>
                  <Field label="Language" error={errors.language}>
                    <FormSelect
                      className={settingsFieldClass("", errors.language)}
                      value={draft.language}
                      aria-invalid={Boolean(errors.language)}
                      onChange={(e) =>
                        onLiveChange({
                          ...draft,
                          ...localeFromLanguage(e.target.value, draft),
                        })
                      }
                    >
                      {withCurrent(LANGUAGES, draft.language).map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </FormSelect>
                  </Field>
                  <Field label="Currency" error={errors.currency}>
                    <FormSelect
                      className={settingsFieldClass("", errors.currency)}
                      value={draft.currency}
                      aria-invalid={Boolean(errors.currency)}
                      onChange={(e) =>
                        onLiveChange({
                          ...draft,
                          ...localeFromCurrency(e.target.value, draft),
                        })
                      }
                    >
                      {withCurrent(CURRENCIES, draft.currency).map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </FormSelect>
                  </Field>
                </div>
              </SettingsCard>
              <SettingsCard
                title="Quick links"
                copy="Jump to the controls owners use most."
              >
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
                  {allowed.includes("sales") ? (
                    <button
                      type="button"
                      onClick={() => go("sales")}
                      className="rounded-[18px] bg-pos-surface-muted px-4 py-4 text-left transition hover:bg-pos-primary/10"
                    >
                      <p className="font-semibold text-pos-ink">Sales rules</p>
                      <p className="mt-1 text-[13px] text-pos-ink-muted">
                        Discounts, refunds, manager PIN
                      </p>
                    </button>
                  ) : null}
                  {allowed.includes("notifications") ? (
                    <button
                      type="button"
                      onClick={() => go("notifications")}
                      className="rounded-[18px] bg-pos-surface-muted px-4 py-4 text-left transition hover:bg-pos-primary/10"
                    >
                      <p className="font-semibold text-pos-ink">Notifications</p>
                      <p className="mt-1 text-[13px] text-pos-ink-muted">
                        Stock, sales, shifts, digests
                      </p>
                    </button>
                  ) : null}
                  {allowed.includes("people") ? (
                    <button
                      type="button"
                      onClick={() => go("people")}
                      className="rounded-[18px] bg-pos-surface-muted px-4 py-4 text-left transition hover:bg-pos-primary/10"
                    >
                      <p className="font-semibold text-pos-ink">People</p>
                      <p className="mt-1 text-[13px] text-pos-ink-muted">
                        Accounts, groups, floor staff
                      </p>
                    </button>
                  ) : null}
                  {allowed.includes("data") ? (
                    <button
                      type="button"
                      onClick={() => go("data")}
                      className="rounded-[18px] bg-pos-surface-muted px-4 py-4 text-left transition hover:bg-pos-primary/10"
                    >
                      <p className="font-semibold text-pos-ink">Data</p>
                      <p className="mt-1 text-[13px] text-pos-ink-muted">
                        Export, import, catalog reset
                      </p>
                    </button>
                  ) : null}
                </div>
              </SettingsCard>
              <div className="flex justify-end">
                <PrimaryButton disabled={busy} onClick={() => void persist(draft)}>
                  {busy ? "Saving…" : "Save general"}
                </PrimaryButton>
              </div>
            </>
          ) : null}

          {active === "appearance" ? <AppearanceStudio /> : null}

          {active === "receipts" ? (
            <ReceiptStudio
              draft={draft}
              company={company}
              busy={busy}
              errors={errors}
              onChange={onLiveChange}
              onPatch={applyPatch}
              onSave={() => void persist(draft)}
            />
          ) : null}

          {active === "invoices" ? (
            <InvoiceStudio
              draft={draft}
              company={company}
              busy={busy}
              errors={errors}
              onChange={onLiveChange}
              onSave={() => void persist(draft)}
              onCompanyHint={() => router.push("/setup/others/company")}
            />
          ) : null}

          {active === "register" ? (
            <>
              <SettingsCard
                title="Till behaviour"
                copy="Shift rules and idle lock for every register."
              >
                <SettingRow
                  title="Require open shift"
                  description="Cashiers must open a shift before selling."
                  control={
                    <Switch
                      checked={draft.requireOpenShift}
                      disabled={busy}
                      onChange={(requireOpenShift) => void toggle("requireOpenShift", requireOpenShift)}
                    />
                  }
                />
                <div className="border-t border-pos-border/50 px-5 py-5 sm:px-6">
                  <Field label="Idle lock (minutes)" error={errors.idleLockMinutes}>
                    <input
                      className={settingsFieldClass(fieldClass, errors.idleLockMinutes)}
                      type="number"
                      min={0}
                      max={240}
                      value={draft.idleLockMinutes}
                      aria-invalid={Boolean(errors.idleLockMinutes)}
                      onChange={(e) =>
                        onLiveChange({ ...draft, idleLockMinutes: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <p className="mt-1 text-[12px] text-pos-ink-faint">
                    0 disables auto-lock. Tills pick this up on heartbeat.
                  </p>
                </div>
              </SettingsCard>
              <div className="flex justify-end">
                <PrimaryButton disabled={busy} onClick={() => void persist(draft)}>
                  {busy ? "Saving…" : "Save register"}
                </PrimaryButton>
              </div>
            </>
          ) : null}

          {active === "inventory" ? (
            <>
              <SettingsCard
                title="Stock rules"
                copy="Alerts and sale blocks when inventory runs low."
              >
                <SettingRow
                  title="Block negative stock"
                  description="Refuse sales that would take quantity below zero."
                  control={
                    <Switch
                      checked={draft.blockNegativeStock}
                      disabled={busy}
                      onChange={(blockNegativeStock) =>
                        void toggle("blockNegativeStock", blockNegativeStock)
                      }
                    />
                  }
                />
                <div className="border-t border-pos-border/50 px-5 py-5 sm:px-6">
                  <Field label="Low stock quantity" error={errors.lowStockQty}>
                    <input
                      className={settingsFieldClass(fieldClass, errors.lowStockQty)}
                      type="number"
                      min={0}
                      value={draft.lowStockQty}
                      aria-invalid={Boolean(errors.lowStockQty)}
                      onChange={(e) =>
                        onLiveChange({ ...draft, lowStockQty: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <p className="mt-1 text-[12px] text-pos-ink-faint">
                    Items at or below this qty show as low stock in HQ.
                  </p>
                </div>
              </SettingsCard>
              <div className="flex justify-end">
                <PrimaryButton disabled={busy} onClick={() => void persist(draft)}>
                  {busy ? "Saving…" : "Save inventory"}
                </PrimaryButton>
              </div>
            </>
          ) : null}

          {active === "sales" ? (
            <SalesPanel
              draft={draft}
              busy={busy}
              errors={errors}
              onChange={onLiveChange}
              onToggle={(key, value) => void toggle(key, value)}
              onSave={() => void persist(draft)}
            />
          ) : null}

          {active === "notifications" ? (
            <NotificationsPanel
              draft={draft}
              busy={busy}
              onToggle={(key, value) => void toggle(key, value)}
            />
          ) : null}

          {active === "people" ? <PeoplePanel granted={granted} /> : null}

          {active === "data" ? (
            <DataPanel granted={granted} onExport={(kind) => void onExport(kind)} />
          ) : null}

          {active === "advanced" ? (
            <>
              <SettingsCard
                title="Tax & pricing"
                copy="How catalogue prices relate to VAT on tickets and invoices."
              >
                <SettingRow
                  title="Prices include VAT"
                  description="When on, till prices already include tax."
                  control={
                    <Switch
                      checked={draft.pricesIncludeVat}
                      disabled={busy}
                      onChange={(pricesIncludeVat) => void toggle("pricesIncludeVat", pricesIncludeVat)}
                    />
                  }
                />
              </SettingsCard>
              <SettingsCard
                title="Printing"
                copy="Extra till print behaviour beyond the receipt studio."
              >
                <SettingRow
                  title="Print duplicate receipt"
                  description="Ask for a merchant copy after each sale."
                  control={
                    <Switch
                      checked={draft.printDuplicateReceipt}
                      disabled={busy}
                      onChange={(printDuplicateReceipt) =>
                        void toggle("printDuplicateReceipt", printDuplicateReceipt)
                      }
                    />
                  }
                />
                <SettingRow
                  title="Show SKU on receipt"
                  description="Same as the toggle in Receipts — kept here for power users."
                  control={
                    <Switch
                      checked={draft.showSkuOnReceipt}
                      disabled={busy}
                      onChange={(showSkuOnReceipt) => void toggle("showSkuOnReceipt", showSkuOnReceipt)}
                    />
                  }
                />
              </SettingsCard>
              <SettingsCard
                title="Connected setup"
                copy="Tax rates and payment rails live in Organization."
              >
                <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
                  {granted.has("others-tax") ? (
                    <Link href="/setup/others/tax" className={secondaryButtonClass}>
                      Tax rates
                    </Link>
                  ) : null}
                  {granted.has("others-payment-gateway") ? (
                    <Link href="/setup/others/payment-gateway" className={secondaryButtonClass}>
                      Gateways
                    </Link>
                  ) : null}
                  {allowed.includes("receipts") ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => go("receipts")}
                    >
                      Receipt studio
                    </button>
                  ) : null}
                  {allowed.includes("invoices") ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => go("invoices")}
                    >
                      Invoice studio
                    </button>
                  ) : null}
                </div>
              </SettingsCard>
            </>
          ) : null}

          {active === "security" ? (
            <>
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
                      <Settings2 size={12} />
                      Active
                    </span>
                  }
                />
              </SettingsCard>
              <SettingsCard
                title="Password policy"
                copy="Rules for HQ account passwords and idle session."
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
                        onLiveChange({ ...draft, passwordMinLength: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Session timeout (minutes)" error={errors.sessionTimeoutMinutes}>
                    <input
                      className={settingsFieldClass(fieldClass, errors.sessionTimeoutMinutes)}
                      type="number"
                      min={0}
                      value={draft.sessionTimeoutMinutes}
                      aria-invalid={Boolean(errors.sessionTimeoutMinutes)}
                      onChange={(e) =>
                        onLiveChange({ ...draft, sessionTimeoutMinutes: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
                <p className="px-5 pb-4 text-[12px] text-pos-ink-faint sm:px-6">
                  0 session timeout means HQ stays signed in until logout. Till idle lock is under
                  Register.
                </p>
                <div className="flex justify-end px-5 pb-5 sm:px-6">
                  <PrimaryButton disabled={busy} onClick={() => void persist(draft)}>
                    {busy ? "Saving…" : "Save policy"}
                  </PrimaryButton>
                </div>
              </SettingsCard>
              <SettingsCard
                title="Password"
                copy="Change the password for this HQ account."
              >
                <form className="space-y-3 px-5 py-5 sm:px-6" onSubmit={onPassword}>
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
            </>
          ) : null}

          {active === "organization" ? (
            <SettingsCard
              title="Organization setup"
              copy="Company structure lives on these pages. Open any one to edit."
            >
              <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {ORG_LINKS.filter(({ req }) => granted.has(req)).map(({ href, label, hint, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-[18px] px-4 py-4 transition hover:bg-pos-surface-muted"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-pos-surface-muted text-pos-ink-muted">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-pos-ink">{label}</span>
                      <span className="block text-[13px] text-pos-ink-muted">{hint}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </SettingsCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
