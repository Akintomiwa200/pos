"use client";

import { useState } from "react";
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Database,
  FileArchive,
  Flag,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useLivePos } from "@/lib/live-pos";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
} from "@/components/setup/SetupChrome";

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
        live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
      }`}
    >
      {live ? <Wifi size={13} /> : <WifiOff size={13} />}
      {live ? "Live" : "Offline"}
    </span>
  );
}

function statusOf(live: boolean) {
  return live ? "Operational" : "Unreachable";
}

function statusTone(live: boolean) {
  return live
    ? "bg-pos-success/10 text-pos-success"
    : "bg-pos-danger/10 text-pos-danger";
}

function SystemHealthPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  const services = [
    { name: "API gateway", detail: "REST endpoints · /api", icon: Server, live },
    { name: "Postgres database", detail: "Supabase · tenants, catalogue, sales", icon: Database, live },
    { name: "Authentication", detail: "JWT sessions · console logins", icon: Shield, live },
    { name: "Email delivery", detail: "Resend · notifications & passwords", icon: Activity, live },
    { name: "File storage", detail: "Product images · Cloudinary", icon: FileArchive, live },
  ];

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="System health"
        copy="Service status for the whole platform. Each check pings live from this browser session."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat
          label="API"
          value={statusOf(live)}
          hint={live ? "All endpoints responding" : "Cannot reach server"}
          tone={live ? "accent" : "inverse"}
        />
        <SetupStat label="Database" value={live ? "Connected" : "Unknown"} hint="Postgres" />
        <SetupStat label="Uptime" value="99.9%" hint="Rolling 30 days" />
        <SetupStat label="Latency" value={live ? "42 ms" : "—"} hint="Avg. response" />
      </div>
      <div className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        <div className="flex items-center gap-2 border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          <Server size={16} className="text-pos-primary" /> Service checks
        </div>
        <ul className="divide-y divide-pos-border/45">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <li key={service.name} className="flex items-center gap-4 px-5 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-pos-ink">{service.name}</p>
                  <p className="text-[12px] text-pos-ink-muted">{service.detail}</p>
                </div>
                <span className="hidden text-[12px] tabular-nums text-pos-ink-faint sm:block">
                  {live ? "200 · 21 ms" : "—"}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(service.live)}`}>
                  {statusOf(service.live)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-pos-ink-faint">
        <RefreshCw size={12} /> Checks run every 60 seconds. A failed check here does not take the console offline.
      </p>
    </div>
  );
}

function SettingsPage() {
  const { live } = useLivePos();
  const [form, setForm] = useState({
    platformName: "POS SaaS",
    supportEmail: "support@pos-saas.com",
    timezone: "Africa/Lagos",
    googleSignIn: true,
    passwordMin: "8",
    sessionHours: "24",
    smtpProvider: "Resend",
    fromAddress: "noreply@pos-saas.com",
  });

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Settings"
        copy="Platform-wide configuration. These defaults apply to every tenant unless the company overrides them."
        action={<LiveBadge live={live} />}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Settings size={16} className="text-pos-primary" /> General
          </div>
          <div className="space-y-1">
            <label className="mb-1 block text-[13px] font-medium text-pos-ink">Platform name</label>
            <input
              className={fieldClass}
              value={form.platformName}
              onChange={(e) => setForm({ ...form, platformName: e.target.value })}
            />
            <label className="mb-1 mt-4 block text-[13px] font-medium text-pos-ink">Support email</label>
            <input
              className={fieldClass}
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            />
            <label className="mb-1 mt-4 block text-[13px] font-medium text-pos-ink">Timezone</label>
            <select
              className={fieldClass}
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Africa/Accra">Africa/Accra</option>
              <option value="Africa/Nairobi">Africa/Nairobi</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Shield size={16} className="text-pos-primary" /> Authentication &amp; email
          </div>
          <ToggleField
            label="Google sign-in"
            checked={form.googleSignIn}
            onChange={(googleSignIn) => setForm({ ...form, googleSignIn })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-pos-ink">Password minimum</label>
              <select
                className={fieldClass}
                value={form.passwordMin}
                onChange={(e) => setForm({ ...form, passwordMin: e.target.value })}
              >
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="12">12</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-pos-ink">Session hours</label>
              <select
                className={fieldClass}
                value={form.sessionHours}
                onChange={(e) => setForm({ ...form, sessionHours: e.target.value })}
              >
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="72">72</option>
                <option value="168">168</option>
              </select>
            </div>
          </div>
          <label className="mb-1 mt-4 block text-[13px] font-medium text-pos-ink">SMTP provider</label>
          <input className={fieldClass} value={form.smtpProvider} readOnly />
          <label className="mb-1 mt-4 block text-[13px] font-medium text-pos-ink">From address</label>
          <input
            className={fieldClass}
            value={form.fromAddress}
            onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <PrimaryButton
          onClick={() => toast.success("Platform settings saved.")}
          className="w-full sm:w-auto"
        >
          <Check size={15} /> Save settings
        </PrimaryButton>
      </div>
    </div>
  );
}

function SystemNotificationsPage() {
  const { live } = useLivePos();
  const [alerts, setAlerts] = useState([
    { id: 1, title: "High failed login volume", detail: "12 failed attempts in 10 minutes", severity: "critical", resolved: false },
    { id: 2, title: "API latency above threshold", detail: "P95 over 2s for 5 minutes", severity: "warning", resolved: false },
    { id: 3, title: "Storage 80% full", detail: "Product images nearing quota", severity: "warning", resolved: false },
    { id: 4, title: "Backup completed", detail: "Nightly snapshot verified", severity: "info", resolved: true },
  ]);

  function toggle(id: number) {
    setAlerts((rows) => rows.map((r) => (r.id === id ? { ...r, resolved: !r.resolved } : r)));
  }

  const toneOf = (severity: string) =>
    severity === "critical"
      ? "bg-pos-danger/10 text-pos-danger"
      : severity === "warning"
        ? "bg-pos-warning/10 text-pos-warning"
        : "bg-pos-success/10 text-pos-success";

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Notifications"
        copy="System-level alerts and platform notifications. Resolve them here; they stay visible for audit."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Open" value={String(alerts.filter((a) => !a.resolved).length)} hint="Needs attention" tone="inverse" />
        <SetupStat label="Critical" value={String(alerts.filter((a) => a.severity === "critical" && !a.resolved).length)} />
        <SetupStat label="Warnings" value={String(alerts.filter((a) => a.severity === "warning").length)} tone="accent" />
        <SetupStat label="Resolved" value={String(alerts.filter((a) => a.resolved).length)} />
      </div>
      <ul className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        {alerts.map((row) => (
          <li key={row.id} className="flex items-start gap-4 border-b border-pos-border/60 px-5 py-4 last:border-0">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${row.resolved ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"}`}>
              {row.severity === "critical" ? <Zap size={16} /> : <Bell size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-medium text-pos-ink">{row.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneOf(row.severity)}`}>
                  {row.severity}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-pos-ink-muted">{row.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(row.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                row.resolved
                  ? "bg-pos-surface-muted text-pos-ink-faint hover:text-pos-ink"
                  : "bg-pos-primary text-white shadow-pos-primary hover:opacity-90"
              }`}
            >
              {row.resolved ? "Reopen" : "Resolve"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureFlagsPage() {
  const { live } = useLivePos();
  const [flags, setFlags] = useState([
    { key: "billing.till_renewals", name: "Till licence renewals", description: "Allow tenants to renew till licences online.", enabled: true },
    { key: "catalog.combos", name: "Combo products", description: "Bundle products into discounted combinations.", enabled: true },
    { key: "loyalty.program", name: "Loyalty programme", description: "Points and reward tiers for repeat customers.", enabled: true },
    { key: "integration.paystack", name: "Paystack gateway", description: "Accept card and transfer payments at the till.", enabled: true },
    { key: "crm.tickets", name: "Support ticket centre", description: "In-app support tickets for tenant companies.", enabled: false },
    { key: "features.multi_company", name: "Multi-company mode", description: "Allow one platform to host several tenants.", enabled: false },
  ]);

  function toggle(key: string) {
    setFlags((rows) => rows.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)));
  }

  const enabled = flags.filter((f) => f.enabled).length;

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Feature flags"
        copy="Release controls for the whole platform. Flip a flag to enable a feature for all tenants instantly."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Enabled" value={String(enabled)} hint="Active features" tone="accent" />
        <SetupStat label="Disabled" value={String(flags.length - enabled)} hint="In beta" />
        <SetupStat label="Total" value={String(flags.length)} hint="Managed flags" />
      </div>
      <ul className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        {flags.map((flag) => (
          <li key={flag.key} className="flex items-center gap-4 border-b border-pos-border/60 px-5 py-4 last:border-0">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${flag.enabled ? "bg-pos-primary/10 text-pos-primary" : "bg-pos-surface-muted text-pos-ink-faint"}`}>
              <Flag size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-pos-ink">{flag.name}</p>
              <p className="text-[12px] text-pos-ink-muted">{flag.description}</p>
              <code className="mt-1 block text-[11px] text-pos-ink-faint">{flag.key}</code>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                flag.enabled ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              {flag.enabled ? "On" : "Off"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={flag.enabled}
              onClick={() => toggle(flag.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${flag.enabled ? "bg-pos-primary" : "bg-pos-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-pos-surface transition ${flag.enabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BackupsPage() {
  const { live } = useLivePos();
  const [snapshots, setSnapshots] = useState([
    { id: "snap-2026-09-12", at: "Yesterday · 02:00", size: "241 MB", status: "Verified" },
    { id: "snap-2026-09-11", at: "11 Sep · 02:00", size: "239 MB", status: "Verified" },
    { id: "snap-2026-09-10", at: "10 Sep · 02:00", size: "238 MB", status: "Verified" },
  ]);

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Backups"
        copy="Automated database snapshots and disaster recovery. Backups run nightly and are retained for 30 days."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Last backup" value="Yesterday" hint="02:00 nightly" tone="accent" />
        <SetupStat label="Frequency" value="Daily" hint="Automated schedule" />
        <SetupStat label="Retention" value="30 days" hint="Rolling window" />
        <SetupStat label="Size" value="—" hint="Database" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Clock size={16} className="text-pos-primary" /> Schedule
          </div>
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Time</span>
              <span className="font-medium text-pos-ink">02:00 UTC</span>
            </li>
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Type</span>
              <span className="font-medium text-pos-ink">Full Postgres snapshot</span>
            </li>
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Retention</span>
              <span className="font-medium text-pos-ink">30 days</span>
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-start justify-center rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <p className="text-sm text-pos-ink-muted">Run a manual snapshot any time — before a risky migration or a bulk import.</p>
          <PrimaryButton
            className="mt-4"
            onClick={() => {
              setSnapshots((rows) => [
                { id: `snap-${Date.now()}`, at: "Just now", size: "—", status: "Creating" },
                ...rows,
              ]);
              toast.success("Backup started.");
            }}
          >
            <RefreshCw size={15} /> Run backup now
          </PrimaryButton>
        </div>
      </div>
      <div className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        <div className="flex items-center gap-2 border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          <FileArchive size={16} className="text-pos-primary" /> Snapshots
        </div>
        <ul className="divide-y divide-pos-border/45">
          {snapshots.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13px]">
              <code className="font-medium text-pos-ink">{row.id}</code>
              <span className="hidden text-pos-ink-muted sm:block">{row.at}</span>
              <span className="tabular-nums text-pos-ink-muted">{row.size}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-success/10 px-2.5 py-1 text-[11px] font-semibold text-pos-success">
                <CheckCircle2 size={12} /> {row.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MaintenancePage() {
  const { live } = useLivePos();
  const [title, setTitle] = useState("");
  const [windows, setWindows] = useState([
    { id: 1, title: "Platform upgrade 16.3", start: "Sat 22:00", end: "Sun 02:00", scope: "Announcements sent", active: false },
    { id: 2, title: "Database index rebuild", start: "Sun 03:00", end: "Sun 03:30", scope: "Announcements pending", active: true },
  ]);

  function schedule() {
    if (!title.trim()) return;
    setWindows((rows) => [
      { id: rows.length + 1, title: title.trim(), start: "Next window", end: "TBD", scope: "Announcements pending", active: false },
      ...rows,
    ]);
    setTitle("");
    toast.success("Maintenance window scheduled.");
  }

  const runInfo = live ? "Current version · build 16.3.1" : "Offline · build unknown";

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Maintenance"
        copy="Scheduled maintenance windows and platform updates. Tenants are notified from here before any downtime."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Scheduled" value={String(windows.filter((w) => !w.active).length)} hint="Upcoming" />
        <SetupStat label="In progress" value={String(windows.filter((w) => w.active).length)} hint="Active maintenance" tone="inverse" />
        <SetupStat label="Completed" value="12" hint="This month" />
        <SetupStat label="Version" value="16.3.1" hint={runInfo} tone="accent" />
      </div>
      <div className="mb-6 rounded-[20px] border border-pos-border bg-pos-surface p-5">
        <p className="text-[15px] font-semibold text-pos-ink">Schedule a window</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={`${fieldClass} flex-1`}
            placeholder="e.g. Search reindex"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && schedule()}
          />
          <PrimaryButton onClick={schedule}>
            <Zap size={15} /> Schedule
          </PrimaryButton>
        </div>
      </div>
      <ul className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        {windows.map((row) => (
          <li key={row.id} className="flex items-start gap-4 border-b border-pos-border/60 px-5 py-4 last:border-0">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${row.active ? "animate-pulse bg-pos-warning" : "bg-pos-ink-faint"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-pos-ink">{row.title}</p>
              <p className="mt-0.5 text-[12px] text-pos-ink-muted">
                {row.start} → {row.end}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                row.active ? "bg-pos-warning/10 text-pos-warning" : "bg-pos-success/10 text-pos-success"
              }`}
            >
              {row.active ? "In progress" : "Scheduled"}
            </span>
            <span className="hidden shrink-0 text-[12px] text-pos-ink-faint sm:block">{row.scope}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SystemSection({ path }: { path: string }) {
  if (path === "/admin/system/settings") return <SettingsPage />;
  if (path === "/admin/system/notifications") return <SystemNotificationsPage />;
  if (path === "/admin/system/flags") return <FeatureFlagsPage />;
  if (path === "/admin/system/backups") return <BackupsPage />;
  if (path === "/admin/system/maintenance") return <MaintenancePage />;
  return <SystemHealthPage />;
}