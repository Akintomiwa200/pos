"use client";

import {
  Activity,
  ScrollText,
  Shield,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";
import { useLiveDirectory } from "@/lib/live-directory";
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

function SecurityDashboard() {
  const { live, ready } = useLivePos();
  const { accounts, groups, ready: dirReady } = useLiveDirectory();
  if (!ready || !dirReady) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Security dashboard"
        copy="Login activity, sessions, and security events across the platform."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active sessions" value="0" hint="Currently logged in" tone="accent" />
        <SetupStat label="Failed logins" value="0" hint="Last 24 hours" />
        <SetupStat label="Users" value={String(accounts.length)} hint="Total accounts" />
        <SetupStat label="Roles" value={String(groups.length)} hint="Groups defined" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/admin/security/logins"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <Activity size={18} className="text-pos-primary" />
          <div>
            <div className="font-medium">Login activity</div>
            <div className="text-pos-ink-muted">Recent authentication events</div>
          </div>
        </a>
        <a
          href="/admin/security/sessions"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <Users size={18} className="text-pos-primary" />
          <div>
            <div className="font-medium">Sessions</div>
            <div className="text-pos-ink-muted">Active user sessions</div>
          </div>
        </a>
        <a
          href="/admin/security/audit"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <ScrollText size={18} className="text-pos-primary" />
          <div>
            <div className="font-medium">Audit logs</div>
            <div className="text-pos-ink-muted">Administrative action history</div>
          </div>
        </a>
        <a
          href="/admin/security/events"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <Shield size={18} className="text-pos-primary" />
          <div>
            <div className="font-medium">Security events</div>
            <div className="text-pos-ink-muted">Anomalies and alerts</div>
          </div>
        </a>
      </div>
    </div>
  );
}

function LoginActivityPage() {
  const { live } = useLivePos();
  const { accounts, ready } = useLiveDirectory();
  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Login activity"
        copy="Recent authentication events across all accounts."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total logins" value="0" hint="All time" tone="accent" />
        <SetupStat label="Today" value="0" hint="Successful" />
        <SetupStat label="Failed" value="0" hint="Last 24 hours" />
        <SetupStat label="Unique users" value={String(accounts.length)} hint="With at least one login" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Login events are recorded as users authenticate via password or Google sign-in.</p>
      </div>
    </div>
  );
}

function SessionsPage() {
  const { live } = useLivePos();
  const { accounts, ready } = useLiveDirectory();
  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Sessions"
        copy="Active user sessions across the platform."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value="0" hint="Currently online" tone="accent" />
        <SetupStat label="Today" value="0" hint="Sessions created" />
        <SetupStat label="Expired" value="0" hint="Timed out" />
        <SetupStat label="Avg. duration" value="—" hint="Session length" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Active sessions track who is currently logged into the platform.</p>
      </div>
    </div>
  );
}

function AuditLogsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Audit logs"
        copy="Administrative actions and configuration changes."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Today" value="0" hint="Actions recorded" />
        <SetupStat label="This week" value="0" hint="All actions" tone="accent" />
        <SetupStat label="By producers" value="0" hint="Super Admin actions" />
        <SetupStat label="By tenants" value="0" hint="Company admin actions" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Audit logs record significant administrative actions for compliance and troubleshooting.</p>
      </div>
    </div>
  );
}

function SecurityEventsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Security events"
        copy="Detected anomalies, failed attempts, and security alerts."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Critical" value="0" hint="Needs attention" />
        <SetupStat label="Warnings" value="0" hint="Review recommended" />
        <SetupStat label="Info" value="0" hint="Informational" tone="accent" />
        <SetupStat label="Resolved" value="0" hint="All time" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Security events flag unusual login patterns, permission escalations, and other anomalies.</p>
      </div>
    </div>
  );
}

export function SecuritySection({ path }: { path: string }) {
  if (path === "/admin/security/logins") return <LoginActivityPage />;
  if (path === "/admin/security/sessions") return <SessionsPage />;
  if (path === "/admin/security/audit") return <AuditLogsPage />;
  if (path === "/admin/security/events") return <SecurityEventsPage />;
  return <SecurityDashboard />;
}
