"use client";

import { useEffect, useState } from "react";
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
  Upload,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useLivePos } from "@/lib/live-pos";
import { asBool, asNum, asStr } from "@/lib/hq-policies";
import { usePolicyCollection } from "@/lib/use-policy-collection";
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

function statusOf(live: boolean | null) {
  return live === null ? "Not configured" : live ? "Operational" : "Unreachable";
}

function statusTone(live: boolean | null) {
  return live === null
    ? "bg-pos-surface-muted text-pos-ink-faint"
    : live
      ? "bg-pos-success/10 text-pos-success"
      : "bg-pos-danger/10 text-pos-danger";
}

function SystemHealthPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  const services = [
    { name: "API gateway", detail: "REST endpoints · /api", icon: Server, live },
    { name: "Persistent data", detail: "JSON collections · local data directory", icon: Database, live },
    { name: "Authentication", detail: "Staff logins · console sessions", icon: Shield, live },
    { name: "Email delivery", detail: "Configured SMTP provider", icon: Activity, live: null },
    { name: "File storage", detail: "Product images and attachments", icon: FileArchive, live: null },
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
        <SetupStat label="Data" value={live ? "Available" : "Unknown"} hint="JSON collections" />
        <SetupStat label="Backups" value="—" hint="See Backups page" />
        <SetupStat label="Latency" value="—" hint="Not measured" />
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
                  {live ? "Reachable" : "—"}
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

const DEFAULT_SETTINGS = {
  platformName: "POS SaaS",
  supportEmail: "support@pos-saas.com",
  timezone: "Africa/Lagos",
  googleSignIn: true,
  passwordMin: "8",
  sessionHours: "24",
  smtpProvider: "Resend",
  fromAddress: "noreply@pos-saas.com",
};

function SettingsPage() {
  const { live } = useLivePos();
  const { rows, loading, save } = usePolicyCollection("systemSettings");
  const record = rows.find((row) => row.id === "platform");
  const [form, setForm] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (loading || !record) return;
    setForm({
      platformName: asStr(record.platformName) || DEFAULT_SETTINGS.platformName,
      supportEmail: asStr(record.supportEmail) || DEFAULT_SETTINGS.supportEmail,
      timezone: asStr(record.timezone) || DEFAULT_SETTINGS.timezone,
      googleSignIn: asBool(record.googleSignIn),
      passwordMin: asStr(record.passwordMin) || DEFAULT_SETTINGS.passwordMin,
      sessionHours: asStr(record.sessionHours) || DEFAULT_SETTINGS.sessionHours,
      smtpProvider: asStr(record.smtpProvider) || DEFAULT_SETTINGS.smtpProvider,
      fromAddress: asStr(record.fromAddress) || DEFAULT_SETTINGS.fromAddress,
    });
  }, [loading, record]);

  async function saveSettings() {
    await save({ ...form, id: "platform", updatedAt: new Date().toISOString() });
    toast.success("Platform settings saved.");
  }

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
          onClick={() => void saveSettings()}
          className="w-full sm:w-auto"
        >
          <Check size={15} /> Save settings
        </PrimaryButton>
      </div>
    </div>
  );
}

const STARTER_ALERTS = [
  { id: "alert-failed-logins", title: "High failed login volume", detail: "12 failed attempts in 10 minutes", severity: "critical", resolved: false },
  { id: "alert-api-latency", title: "API latency above threshold", detail: "P95 over 2s for 5 minutes", severity: "warning", resolved: false },
  { id: "alert-storage", title: "Storage 80% full", detail: "Product images nearing quota", severity: "warning", resolved: false },
  { id: "alert-backup", title: "Backup completed", detail: "Nightly snapshot verified", severity: "info", resolved: true },
];

function SystemNotificationsPage() {
  const { live } = useLivePos();
  const { rows: alerts, save, remove } = usePolicyCollection("systemAlerts");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (alerts.length === 0 && !seeded) {
      setSeeded(true);
      void Promise.all(STARTER_ALERTS.map((alert) => save(alert)));
    }
  }, [alerts.length, seeded, save]);

  async function toggle(id: string, resolved: boolean) {
    await save({ id, resolved: !resolved, updatedAt: new Date().toISOString() });
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
        <SetupStat label="Open" value={String(alerts.filter((a) => !asBool(a.resolved)).length)} hint="Needs attention" tone="inverse" />
        <SetupStat label="Critical" value={String(alerts.filter((a) => asStr(a.severity) === "critical" && !asBool(a.resolved)).length)} />
        <SetupStat label="Warnings" value={String(alerts.filter((a) => asStr(a.severity) === "warning").length)} tone="accent" />
        <SetupStat label="Resolved" value={String(alerts.filter((a) => asBool(a.resolved)).length)} />
      </div>
      <ul className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        {alerts.map((row) => (
          <li key={row.id} className="flex items-start gap-4 border-b border-pos-border/60 px-5 py-4 last:border-0">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${asBool(row.resolved) ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"}`}>
              {asStr(row.severity) === "critical" ? <Zap size={16} /> : <Bell size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-medium text-pos-ink">{asStr(row.title)}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneOf(asStr(row.severity))}`}>
                  {asStr(row.severity)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-pos-ink-muted">{asStr(row.detail)}</p>
            </div>
            <button
              type="button"
              onClick={() => void toggle(row.id, asBool(row.resolved))}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                asBool(row.resolved)
                  ? "bg-pos-surface-muted text-pos-ink-faint hover:text-pos-ink"
                  : "bg-pos-primary text-white shadow-pos-primary hover:opacity-90"
              }`}
            >
              {asBool(row.resolved) ? "Reopen" : "Resolve"}
            </button>
            <button type="button" aria-label="Delete alert" className="shrink-0 text-pos-ink-faint hover:text-pos-danger" onClick={() => void remove(row.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STARTER_FLAGS = [
  { id: "billing.till_renewals", name: "Till licence renewals", description: "Allow tenants to renew till licences online.", enabled: true },
  { id: "catalog.combos", name: "Combo products", description: "Bundle products into discounted combinations.", enabled: true },
  { id: "loyalty.program", name: "Loyalty programme", description: "Points and reward tiers for repeat customers.", enabled: true },
  { id: "integration.paystack", name: "Paystack gateway", description: "Accept card and transfer payments at the till.", enabled: true },
  { id: "crm.tickets", name: "Support ticket centre", description: "In-app support tickets for tenant companies.", enabled: false },
  { id: "features.multi_company", name: "Multi-company mode", description: "Allow one platform to host several tenants.", enabled: false },
];

function FeatureFlagsPage() {
  const { live } = useLivePos();
  const { rows: flags, save } = usePolicyCollection("featureFlags");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (flags.length === 0 && !seeded) {
      setSeeded(true);
      void Promise.all(STARTER_FLAGS.map((flag) => save(flag)));
    }
  }, [flags.length, seeded, save]);

  async function toggle(id: string, enabled: boolean) {
    await save({ id, enabled: !enabled, updatedAt: new Date().toISOString() });
  }

  const enabled = flags.filter((flag) => asBool(flag.enabled)).length;

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
          <li key={flag.id} className="flex items-center gap-4 border-b border-pos-border/60 px-5 py-4 last:border-0">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${asBool(flag.enabled) ? "bg-pos-primary/10 text-pos-primary" : "bg-pos-surface-muted text-pos-ink-faint"}`}>
              <Flag size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-pos-ink">{asStr(flag.name)}</p>
              <p className="text-[12px] text-pos-ink-muted">{asStr(flag.description)}</p>
              <code className="mt-1 block text-[11px] text-pos-ink-faint">{flag.id}</code>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                asBool(flag.enabled) ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              {asBool(flag.enabled) ? "On" : "Off"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={asBool(flag.enabled)}
              onClick={() => void toggle(flag.id, asBool(flag.enabled))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${asBool(flag.enabled) ? "bg-pos-primary" : "bg-pos-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-pos-surface transition ${asBool(flag.enabled) ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BackupRecord = {
  id: string;
  at: string;
  bytes: number;
  files: number;
  status?: string;
};

function BackupsPage() {
  const { live } = useLivePos();
  const { rows: snapshots, save, refresh } = usePolicyCollection("backups");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState("");

  useEffect(() => {
    void fetchBackupList();
  }, []);

  async function fetchBackupList() {
    try {
      const { api } = await import("@/lib/hq-api");
      const stored = await api<BackupRecord[]>("/api/console/backup");
      for (const row of stored) {
        if (!snapshots.some((item) => item.id === row.id)) {
          await save({ ...row, status: "Verified" });
        }
      }
    } catch {
      // The console still shows locally recorded backups when HQ is offline.
    }
  }

  async function runBackup() {
    setBusy(true);
    try {
      const { api } = await import("@/lib/hq-api");
      const record = await api<BackupRecord>("/api/console/backup", { method: "POST" });
      await save({ ...record, status: "Verified" });
      toast.success(`Backup ${record.id} created.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(id?: string, payload?: unknown) {
    if (id && !window.confirm(`Restore ${id}? Current JSON collections will be overwritten.`)) return;
    setRestoring(id || "upload");
    try {
      const { api } = await import("@/lib/hq-api");
      const result = await api<{ restored: string[]; skipped: string[] }>(
        id ? `/api/console/backup/${encodeURIComponent(id)}/restore` : "/api/console/backup/restore",
        id ? { method: "POST" } : { method: "POST", body: JSON.stringify(payload) },
      );
      toast.success(`Restored ${result.restored.length} collection(s). Restart the backend if cached screens look stale.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setRestoring("");
    }
  }

  async function restoreFile(file: File | undefined) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      await restoreBackup(undefined, payload);
    } catch {
      toast.error("That file is not valid backup JSON.");
    }
  }

  const sorted = [...snapshots].sort((a, b) => asStr(b.at).localeCompare(asStr(a.at)));

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Backups"
        copy="Create restorable JSON snapshots of every persisted collection, then recover them from this page or upload a saved backup file."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Snapshots" value={String(sorted.length)} hint="Recorded backups" tone="accent" />
        <SetupStat label="Last backup" value={sorted[0] ? new Date(asStr(sorted[0].at)).toLocaleDateString() : "—"} hint="Most recent" />
        <SetupStat label="Collections" value={String(sorted[0] ? asNum(sorted[0].files) : 0)} hint="JSON data files" />
        <SetupStat label="Size" value={sorted[0] ? `${(asNum(sorted[0].bytes) / 1024).toFixed(1)} KB` : "—"} hint="Latest snapshot" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Clock size={16} className="text-pos-primary" /> Recovery
          </div>
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Format</span>
              <span className="font-medium text-pos-ink">JSON collections</span>
            </li>
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Scope</span>
              <span className="font-medium text-pos-ink">Every data/*.json file</span>
            </li>
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Restore</span>
              <span className="font-medium text-pos-ink">Snapshot or uploaded file</span>
            </li>
          </ul>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-pos-border px-4 py-2 text-[12px] font-semibold text-pos-ink transition hover:bg-pos-surface-muted">
            <Upload size={14} />
            {restoring === "upload" ? "Restoring…" : "Restore JSON file"}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={Boolean(restoring)}
              onChange={(event) => void restoreFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="flex flex-col items-start justify-center rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <p className="text-sm text-pos-ink-muted">Create a restorable JSON snapshot of every persisted data collection before a risky migration or bulk import.</p>
          <PrimaryButton
            className="mt-4"
            disabled={busy}
            onClick={() => void runBackup()}
          >
            <RefreshCw size={15} /> {busy ? "Creating…" : "Run backup now"}
          </PrimaryButton>
        </div>
      </div>
      <div className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
        <div className="flex items-center gap-2 border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          <FileArchive size={16} className="text-pos-primary" /> Snapshots
        </div>
        <ul className="divide-y divide-pos-border/45">
          {sorted.length === 0 ? (
            <li className="px-5 py-8 text-center text-[13px] text-pos-ink-faint">No snapshots yet. Run a backup to create one.</li>
          ) : sorted.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13px]">
              <code className="font-medium text-pos-ink">{row.id}</code>
              <span className="hidden text-pos-ink-muted sm:block">{new Date(asStr(row.at)).toLocaleString()}</span>
              <span className="tabular-nums text-pos-ink-muted">{(asNum(row.bytes) / 1024).toFixed(1)} KB</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-success/10 px-2.5 py-1 text-[11px] font-semibold text-pos-success">
                <CheckCircle2 size={12} /> {asStr(row.status) || "Verified"}
              </span>
              <button
                type="button"
                disabled={Boolean(restoring)}
                onClick={() => void restoreBackup(row.id)}
                className="shrink-0 rounded-full border border-pos-border px-3 py-1 text-[11px] font-semibold text-pos-ink transition hover:bg-pos-surface-muted disabled:opacity-60"
              >
                {restoring === row.id ? "Restoring…" : "Restore"}
              </button>
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