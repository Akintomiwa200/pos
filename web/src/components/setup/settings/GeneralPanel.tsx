"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Languages,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Percent,
  Save,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import { settingsFieldClass, type SettingsFieldErrors } from "@/lib/settings-validation";
import type { SettingsSectionId } from "@/lib/settings-access";
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
  FormSelect,
  LiveBadge,
  PrimaryButton,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { SettingsCard } from "./settings-ui";

const SAMPLE_DATE = new Date("2026-01-15T10:30:00Z");

type ThemeValue = HqOrgSettings["uiTheme"];

const THEME_OPTIONS: {
  id: ThemeValue;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { id: "light", label: "Light", hint: "Bright surfaces", icon: Sun },
  { id: "dark", label: "Dark", hint: "Dim HQ chrome", icon: Moon },
  { id: "system", label: "System", hint: "Match device", icon: Monitor },
];

export type GeneralOrgLink = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  req: string;
};

type QuickLink = {
  id: SettingsSectionId;
  label: string;
  hint: string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  {
    id: "sales",
    label: "Sales rules",
    hint: "Discounts, refunds, manager PIN",
    icon: ShoppingCart,
  },
  {
    id: "notifications",
    label: "Notifications",
    hint: "Stock, sales, shifts, digests",
    icon: Bell,
  },
  {
    id: "people",
    label: "People",
    hint: "Accounts, groups, floor staff",
    icon: Users,
  },
  {
    id: "data",
    label: "Data",
    hint: "Export, import, catalog reset",
    icon: Database,
  },
];

const ORG_ICONS: Record<string, LucideIcon> = {
  "others-company": Building2,
  "others-branch": MapPin,
  "others-store": Store,
  "others-storefront": Globe2,
  "others-payment-gateway": Banknote,
  "others-tax": Percent,
  "users-role": ShieldCheck,
};

function safely<T>(format: () => T, fallback: T): T {
  try {
    return format();
  } catch {
    return fallback;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2) : ["P", "O"])
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PreferenceCard({
  label,
  hint,
  icon: Icon,
  error,
  valueLabel,
  children,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  error?: string;
  valueLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-pos-border/60 bg-pos-surface-muted/40 p-4 transition focus-within:border-pos-primary/40 focus-within:bg-pos-surface focus-within:ring-2 focus-within:ring-pos-primary/10">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-pos-ink">{label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-pos-ink-muted">{hint}</p>
        </div>
      </div>
      <div className="mt-3 min-w-0">{children}</div>
      <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-pos-ink-faint">
        <CheckCircle2 size={12} className="shrink-0 text-pos-success" />
        <span className="truncate" title={valueLabel} suppressHydrationWarning>
          {valueLabel}
        </span>
      </div>
      {error ? (
        <p className="mt-1.5 text-[12px] text-pos-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GeneralPanel({
  draft,
  company,
  errors,
  busy,
  allowed,
  granted,
  orgLinks,
  onLiveChange,
  onSave,
  onNavigate,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
  errors: SettingsFieldErrors;
  busy: boolean;
  allowed: readonly SettingsSectionId[];
  granted: Set<string>;
  orgLinks: ReadonlyArray<GeneralOrgLink>;
  onLiveChange: (next: HqOrgSettings) => void;
  onSave: () => void;
  onNavigate: (section: SettingsSectionId) => void;
}) {
  const samples = useMemo(() => {
    const languageLabel = LANGUAGES.find((row) => row.value === draft.language)?.label ?? draft.language;
    const currencyLabel = CURRENCIES.find((row) => row.value === draft.currency)?.label ?? draft.currency;
    const city = draft.timezone.split("/").pop()?.replace(/_/g, " ") ?? draft.timezone;

    return {
      languageLabel,
      currencyLabel,
      city,
      money: safely(
        () =>
          new Intl.NumberFormat(draft.language, {
            style: "currency",
            currency: draft.currency,
            maximumFractionDigits: 2,
          }).format(12450.5),
        `${draft.currency} 12,450.50`,
      ),
      date: safely(
        () =>
          new Intl.DateTimeFormat(draft.language, {
            timeZone: draft.timezone,
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(SAMPLE_DATE),
        "15 Jan 2026",
      ),
      time: safely(
        () =>
          new Intl.DateTimeFormat(draft.language, {
            timeZone: draft.timezone,
            hour: "2-digit",
            minute: "2-digit",
          }).format(SAMPLE_DATE),
        "10:30",
      ),
    };
  }, [draft.currency, draft.language, draft.timezone]);

  const activeTheme =
    THEME_OPTIONS.find(({ id }) => id === draft.uiTheme)?.id ?? "system";
  const themeLabel = THEME_OPTIONS.find(({ id }) => id === activeTheme)?.label ?? "System";

  const visibleQuickLinks = QUICK_LINKS.filter(({ id }) => allowed.includes(id));
  const visibleOrgLinks = orgLinks
    .filter(({ req }) => granted.has(req))
    .slice(0, 6)
    .map((link) => ({ ...link, icon: ORG_ICONS[link.req] ?? link.icon }));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] bg-pos-inverse p-5 text-pos-inverse-ink shadow-pos-md sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-pos-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-pos-primary/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pos-inverse-ink/12 text-[16px] font-semibold tracking-wide ring-1 ring-pos-inverse-ink/15">
              {initials(company?.name ?? "POS HQ")}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pos-inverse-ink/55">
                Workspace
              </p>
              <h2 className="mt-1 truncate text-[20px] font-semibold tracking-tight sm:text-[22px]">
                {company?.name ?? "Your organization"}
              </h2>
              <p className="mt-1 truncate text-[13px] text-pos-inverse-ink/60">
                {company?.country || "Country not set"} · {company?.currency || draft.currency}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge live={!busy} label={busy ? "Saving" : "Live"} tone="inverse" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-inverse-ink/10 px-2.5 py-1 text-[11px] font-semibold text-pos-inverse-ink/80 ring-1 ring-pos-inverse-ink/10">
              <Sparkles size={12} />
              General preferences
            </span>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Timezone", value: samples.city, icon: Clock3 },
            { label: "Language", value: samples.languageLabel, icon: Languages },
            { label: "Currency", value: draft.currency, icon: Banknote },
            { label: "Theme", value: themeLabel, icon: Palette },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex min-w-0 items-center gap-3 rounded-2xl bg-pos-inverse-ink/8 px-3.5 py-3 ring-1 ring-pos-inverse-ink/10"
            >
              <Icon size={15} className="shrink-0 text-pos-inverse-ink/55" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pos-inverse-ink/45">
                  {label}
                </p>
                <p className="mt-0.5 truncate text-[13px] font-medium text-pos-inverse-ink/90" title={value}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SettingsCard
        title="Locale & currency"
        copy="Change one preference and the others follow automatically. Every till and document picks up the new values live."
        action={<LiveBadge live={!busy} label={busy ? "Saving" : "Auto-saved"} />}
      >
        <div className="grid min-w-0 gap-3 px-5 py-5 sm:grid-cols-3 sm:px-6 [&>*]:min-w-0">
          <PreferenceCard
            label="Timezone"
            hint="Sets receipt and report dates."
            icon={Clock3}
            error={errors.timezone}
            valueLabel={`${samples.city} · ${samples.time}`}
          >
            <FormSelect
              aria-label="Timezone"
              className={settingsFieldClass("w-full", errors.timezone)}
              value={draft.timezone}
              aria-invalid={Boolean(errors.timezone)}
              onChange={(e) =>
                onLiveChange({ ...draft, ...localeFromTimezone(e.target.value, draft) })
              }
            >
              {withCurrentValue(listTimezones(), draft.timezone).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </FormSelect>
          </PreferenceCard>
          <PreferenceCard
            label="Language"
            hint="Formats numbers, dates, and labels."
            icon={Languages}
            error={errors.language}
            valueLabel={samples.languageLabel}
          >
            <FormSelect
              aria-label="Language"
              className={settingsFieldClass("w-full", errors.language)}
              value={draft.language}
              aria-invalid={Boolean(errors.language)}
              onChange={(e) =>
                onLiveChange({ ...draft, ...localeFromLanguage(e.target.value, draft) })
              }
            >
              {withCurrent(LANGUAGES, draft.language).map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </FormSelect>
          </PreferenceCard>
          <PreferenceCard
            label="Currency"
            hint="Used on prices, totals, and invoices."
            icon={Banknote}
            error={errors.currency}
            valueLabel={samples.currencyLabel}
          >
            <FormSelect
              aria-label="Currency"
              className={settingsFieldClass("w-full", errors.currency)}
              value={draft.currency}
              aria-invalid={Boolean(errors.currency)}
              onChange={(e) =>
                onLiveChange({ ...draft, ...localeFromCurrency(e.target.value, draft) })
              }
            >
              {withCurrent(CURRENCIES, draft.currency).map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </FormSelect>
          </PreferenceCard>
        </div>

        <div className="border-t border-pos-border/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-pos-surface-muted/60 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
                Live sample
              </p>
              <p className="mt-1 text-[13px] text-pos-ink-muted" suppressHydrationWarning>
                {samples.date}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
                Receipt total
              </p>
              <p
                className="mt-1 text-[20px] font-semibold tracking-tight text-pos-primary tabular-nums"
                suppressHydrationWarning
              >
                {samples.money}
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Theme"
        copy="Choose how HQ looks. Your choice applies instantly and syncs across devices."
      >
        <div
          className="grid gap-3 p-5 sm:grid-cols-3 sm:px-6"
          role="group"
          aria-label="Theme preference"
        >
          {THEME_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
            const on = id === activeTheme;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => onLiveChange({ ...draft, uiTheme: id })}
                className={`rounded-[18px] border px-4 py-4 text-left transition ${
                  on
                    ? "border-pos-primary bg-pos-primary/10 shadow-pos-sm"
                    : "border-transparent bg-pos-surface-muted hover:border-pos-border"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full ${
                    on ? "bg-pos-primary text-pos-inverse-ink" : "bg-pos-surface text-pos-ink-muted"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-pos-ink">{label}</p>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">{hint}</p>
              </button>
            );
          })}
        </div>
        {errors.uiTheme ? (
          <p className="px-5 pb-5 text-[12px] text-pos-danger sm:px-6" role="alert">
            {errors.uiTheme}
          </p>
        ) : null}
      </SettingsCard>

      {visibleQuickLinks.length ? (
        <SettingsCard
          title="Quick links"
          copy="The controls owners open most often."
        >
          <div className="grid gap-2.5 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
            {visibleQuickLinks.map(({ id, label, hint, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className="group flex items-start gap-3 rounded-[18px] bg-pos-surface-muted px-4 py-4 text-left transition hover:bg-pos-primary/10"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pos-surface text-pos-ink-muted transition group-hover:bg-pos-primary group-hover:text-pos-inverse-ink">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-pos-ink">
                    {label}
                    <ArrowRight
                      size={13}
                      className="text-pos-ink-faint transition group-hover:translate-x-0.5 group-hover:text-pos-primary"
                    />
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-pos-ink-muted">
                    {hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </SettingsCard>
      ) : null}

      {visibleOrgLinks.length ? (
        <SettingsCard
          title="Organization setup"
          copy="Company structure lives on these pages. Open any one to edit."
        >
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleOrgLinks.map(({ href, label, hint, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-[18px] px-4 py-3.5 transition hover:bg-pos-surface-muted"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink-muted group-hover:bg-pos-primary/10 group-hover:text-pos-primary">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-pos-ink">{label}</span>
                  <span className="block truncate text-[12px] text-pos-ink-muted">{hint}</span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-pos-ink-faint" />
              </Link>
            ))}
          </div>
        </SettingsCard>
      ) : null}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-pos-border/60 bg-pos-surface/95 p-3 shadow-pos-md backdrop-blur">
        <p className="flex items-center gap-2 text-[13px] text-pos-ink-muted">
          <CheckCircle2 size={15} className="shrink-0 text-pos-success" />
          General preferences save automatically. Use the button to confirm the full settings draft.
        </p>
        <div className="flex items-center gap-2">
          {allowed.includes("appearance") ? (
            <Link href="/setup/others/settings?section=appearance" className={secondaryButtonClass}>
              Appearance
            </Link>
          ) : null}
          <PrimaryButton disabled={busy} onClick={onSave}>
            {busy ? <Save size={15} className="animate-pulse" /> : <Save size={15} />}
            {busy ? "Saving…" : "Save general"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
