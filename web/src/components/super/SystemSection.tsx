"use client";

import {
  Wifi,
  WifiOff,
} from "lucide-react";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";
import { useLivePos } from "@/lib/live-pos";

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

function SystemHealthPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="System health"
        copy="API status, database connectivity, and service health."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat
          label="API"
          value={live ? "Healthy" : "Offline"}
          hint={live ? "All endpoints responding" : "Cannot reach server"}
          tone={live ? "accent" : "default"}
        />
        <SetupStat label="Database" value={live ? "Connected" : "Unknown"} hint="Supabase Postgres" />
        <SetupStat label="Uptime" value={live ? "—" : "—"} hint="Since last restart" />
        <SetupStat label="Latency" value={live ? "—" : "—"} hint="Avg. response time" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>
          {live
            ? "All core services are running normally. Check individual components for detailed status."
            : "The backend appears to be offline. Check the server logs for more details."}
        </p>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Settings"
        copy="Platform-wide configuration and environment settings."
        action={<LiveBadge live={live} />}
      />
      <div className="space-y-4">
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 text-[13px] font-semibold text-pos-ink">General</div>
          <div className="space-y-3 text-[13px] text-pos-ink-muted">
            <div className="flex items-center justify-between">
              <span>Platform name</span>
              <span className="text-pos-ink">POS SaaS</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Support email</span>
              <span className="text-pos-ink">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Timezone</span>
              <span className="text-pos-ink">Africa/Lagos</span>
            </div>
          </div>
        </div>
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 text-[13px] font-semibold text-pos-ink">Authentication</div>
          <div className="space-y-3 text-[13px] text-pos-ink-muted">
            <div className="flex items-center justify-between">
              <span>Google sign-in</span>
              <span className="text-pos-success font-medium">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Password policy</span>
              <span className="text-pos-ink">Minimum 8 characters</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Session timeout</span>
              <span className="text-pos-ink">24 hours</span>
            </div>
          </div>
        </div>
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 text-[13px] font-semibold text-pos-ink">Email</div>
          <div className="space-y-3 text-[13px] text-pos-ink-muted">
            <div className="flex items-center justify-between">
              <span>SMTP provider</span>
              <span className="text-pos-ink">Resend</span>
            </div>
            <div className="flex items-center justify-between">
              <span>From address</span>
              <span className="text-pos-ink">noreply@pos-saas.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemNotificationsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Notifications"
        copy="System-level alerts and platform notifications."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value="0" hint="Current alerts" />
        <SetupStat label="Resolved" value="0" hint="Today" tone="accent" />
        <SetupStat label="Critical" value="0" hint="Needs attention" />
        <SetupStat label="Info" value="0" hint="Informational" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>System notifications alert administrators about service status, capacity, and errors.</p>
      </div>
    </div>
  );
}

function FeatureFlagsPage() {
  const { live } = useLivePos();
  const flags = [
    { name: "Google OAuth", key: "google-auth", enabled: true, description: "Allow Google sign-in for authentication" },
    { name: "Multi-branch", key: "multi-branch", enabled: true, description: "Enable multi-branch support for companies" },
    { name: "Storefronts", key: "storefronts", enabled: true, description: "Online storefront creation for companies" },
    { name: "API access", key: "api-access", enabled: false, description: "Expose REST API for external integrations" },
    { name: "Custom themes", key: "custom-themes", enabled: false, description: "Allow companies to customise their POS theme" },
  ];

  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Feature flags"
        copy="Toggle platform features on and off across all tenants."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Enabled" value={String(flags.filter((f) => f.enabled).length)} hint="Active flags" tone="accent" />
        <SetupStat label="Disabled" value={String(flags.filter((f) => !f.enabled).length)} hint="Off flags" />
        <SetupStat label="Total" value={String(flags.length)} hint="All flags" />
      </div>
      <div className="space-y-2">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="flex items-center justify-between rounded-[18px] border border-pos-border bg-pos-surface p-4"
          >
            <div>
              <div className="text-[13px] font-medium text-pos-ink">{flag.name}</div>
              <div className="text-[12px] text-pos-ink-muted">{flag.description}</div>
            </div>
            <div
              className={`flex h-7 w-12 cursor-pointer items-center rounded-full px-1 transition-colors ${
                flag.enabled ? "bg-pos-primary" : "bg-pos-surface-muted"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  flag.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Backups"
        copy="Database backups and disaster recovery status."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Last backup" value="—" hint="Timestamp" tone="accent" />
        <SetupStat label="Frequency" value="Daily" hint="Automated schedule" />
        <SetupStat label="Retention" value="30 days" hint="Rolling window" />
        <SetupStat label="Size" value="—" hint="Database size" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>
          Backups are managed by Supabase automatically. Manual backup triggers and restore points
          will be available here.
        </p>
      </div>
    </div>
  );
}

function MaintenancePage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · System"
        title="Maintenance"
        copy="Scheduled maintenance windows and platform updates."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Scheduled" value="0" hint="Upcoming windows" />
        <SetupStat label="In progress" value="0" hint="Active maintenance" />
        <SetupStat label="Completed" value="0" hint="This month" tone="accent" />
        <SetupStat label="Last update" value="—" hint="Platform version" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Schedule maintenance windows to notify tenants of upcoming downtime or updates.</p>
      </div>
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
