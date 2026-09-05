"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  ScrollText,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useLiveDirectory } from "@/lib/live-directory";
import { useLivePos } from "@/lib/live-pos";
import { getSecurityOverview, type SecurityOverview } from "@/lib/hq-api";

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

function useOverview() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    getSecurityOverview()
      .then((row) => {
        if (mounted) setData(row);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { data, ready };
}

function SeverityDot({ severity }: { severity: string }) {
  const tone =
    severity === "critical"
      ? "bg-pos-danger"
      : severity === "warning"
        ? "bg-pos-warning"
        : "bg-pos-success";
  return <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />;
}

function ChartCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-pos-border bg-pos-surface p-5 shadow-pos-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-pos-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function tooltipStyle(colors: ReturnType<typeof useThemeColors>) {
  return {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    color: colors.ink,
    fontSize: 12,
  };
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
      {children}
    </div>
  );
}

function SecurityDashboard() {
  const colors = useThemeColors();
  const { live, ready: posReady } = useLivePos();
  const { data, ready: dataReady } = useOverview();
  if (!posReady || !dataReady || !data) return <ManagerSkeleton variant="table" />;

  const logins = data.logins;
  const events = data.events;

  const severityData = [
    { name: "Critical", value: events.critical, color: colors.danger },
    { name: "Warnings", value: events.warnings, color: colors.warning },
    { name: "Info", value: events.info, color: colors.success },
  ].filter((row) => row.value > 0);

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Security dashboard"
        copy="Login activity, sessions, and security events across the platform."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active sessions" value={String(data.activeSessions)} hint="Currently logged in" tone="accent" />
        <SetupStat label="Failed logins" value={String(logins.failed)} hint="All time" />
        <SetupStat label="Users" value={String(data.accounts)} hint="Total accounts" />
        <SetupStat label="Roles" value={String(data.groups)} hint="Groups defined" />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard title="Login activity · last 14 days">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={logins.trend} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={colors.chartGrid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  stroke={colors.inkFaint}
                  fontSize={10}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tickLine={false} axisLine={false} width={32} stroke={colors.inkFaint} fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(value, key) => [`${value}`, key === "success" ? "Successful" : "Failed"]}
                  contentStyle={tooltipStyle(colors)}
                />
                <Bar dataKey="success" fill={colors.success} maxBarSize={18} radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill={colors.danger} maxBarSize={18} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Security events">
          {severityData.length === 0 ? (
            <div className="grid h-[260px] place-items-center text-sm text-pos-ink-faint">
              No security events recorded.
            </div>
          ) : (
            <div className="grid h-[260px] place-items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {severityData.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle(colors)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            {severityData.map((row) => (
              <span key={row.name} className="inline-flex items-center gap-1.5 text-[12px] text-pos-ink-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                {row.name} · {row.value}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-pos-warning" />
          <div className="min-w-0">
            <div className="font-medium">Open security events</div>
            <div className="mt-1 text-pos-ink-muted">
              {events.open} unresolved alert{events.open === 1 ? "" : "s"} across the platform.{" "}
              <a href="/admin/security/events" className="text-pos-primary hover:underline">
                Review
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink">
          <Users size={18} className="mt-0.5 shrink-0 text-pos-primary" />
          <div className="min-w-0">
            <div className="font-medium">User distribution</div>
            <div className="mt-1 text-pos-ink-muted">
              {data.accounts} accounts spread across {data.groups} roles.{" "}
              <a href="/admin/security/logins" className="text-pos-primary hover:underline">
                View logins
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Recent login activity">
          {logins.recent.length === 0 ? (
            <EmptyCard>No authentication events recorded yet.</EmptyCard>
          ) : (
            <ul className="divide-y divide-pos-border/45">
              {logins.recent.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <UserCheck size={15} className={row.success ? "text-pos-success" : "text-pos-danger"} />
                  <span className="min-w-0 flex-1 truncate text-pos-ink">{row.email}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      row.success
                        ? "bg-pos-success/10 text-pos-success"
                        : "bg-pos-danger/10 text-pos-danger"
                    }`}
                  >
                    {row.success ? "Success" : "Failed"}
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-pos-ink-faint">
                    {new Date(row.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Open security events">
          {events.recent.filter((row) => !row.resolved).length === 0 ? (
            <EmptyCard>No unresolved security events.</EmptyCard>
          ) : (
            <ul className="divide-y divide-pos-border/45">
              {events.recent
                .filter((row) => !row.resolved)
                .slice(0, 8)
                .map((row) => (
                  <li key={row.id} className="flex items-start gap-3 py-2.5 text-[13px]">
                    <SeverityDot severity={row.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-pos-ink">{row.title}</p>
                      {row.body ? <p className="truncate text-[12px] text-pos-ink-muted">{row.body}</p> : null}
                    </div>
                    <span className="shrink-0 text-[12px] text-pos-ink-faint">
                      {new Date(row.at).toLocaleString()}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
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
  const colors = useThemeColors();
  const { live } = useLivePos();
  const { data, ready } = useOverview();
  if (!ready || !data) return <ManagerSkeleton variant="table" />;

  const logins = data.logins;
  const trend = logins.trend;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Login activity"
        copy="Recent authentication events across all accounts."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total logins" value={String(logins.total)} hint="All time" tone="accent" />
        <SetupStat label="Today" value={String(logins.today)} hint="Successful" />
        <SetupStat label="Failed" value={String(logins.failed)} hint="All time" />
        <SetupStat label="Unique users" value={String(logins.uniqueUsers)} hint="With at least one login" />
      </div>

      <div className="mb-6">
        <ChartCard title="Sign-in outcomes · last 14 days">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={colors.chartGrid} vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={10} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} width={32} stroke={colors.inkFaint} fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(value, key) => [`${value}`, key === "success" ? "Successful" : "Failed"]}
                  contentStyle={tooltipStyle(colors)}
                />
                <Bar dataKey="success" fill={colors.success} maxBarSize={20} radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill={colors.danger} maxBarSize={20} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <section className="overflow-hidden rounded-[18px] border border-pos-border bg-pos-surface shadow-pos-sm">
        <div className="border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          Login events
        </div>
        {logins.recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-pos-ink-faint">No login events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-pos-border/60 bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/45">
                {logins.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-pos-surface-muted/60">
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.success ? "bg-pos-success/10 text-pos-success" : "bg-pos-danger/10 text-pos-danger"
                        }`}
                      >
                        {row.success ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {row.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-pos-ink-muted">{row.reason ?? "—"}</td>
                    <td className="px-5 py-3 text-[12px] tabular-nums text-pos-ink-muted">
                      {new Date(row.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SessionsPage() {
  const colors = useThemeColors();
  const { live } = useLivePos();
  const { data, ready } = useOverview();
  if (!ready || !data) return <ManagerSkeleton variant="table" />;

  const sessions = data.sessions;
  const byGroup = data.accountsByGroup;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Sessions"
        copy="Active user sessions across the platform."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active sessions" value={String(sessions.active)} hint="Currently online" tone="accent" />
        <SetupStat label="Unique users" value={String(sessions.unique)} hint="Logged in historically" />
        <SetupStat label="Ended" value={String(sessions.ended)} hint="Signed out" />
        <SetupStat label="Roles" value={String(byGroup.length)} hint="Groups defined" />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ChartCard title="Users by role">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byGroup} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={colors.chartGrid} horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={11} width={120} />
                <Tooltip formatter={(value) => [`${value}`, "Members"]} contentStyle={tooltipStyle(colors)} />
                <Bar dataKey="members" fill={colors.primary} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Roles">
          <ul className="space-y-3">
            {data.roles.map((role) => (
              <li
                key={role.name}
                className="flex items-center justify-between rounded-[14px] border border-pos-border/60 bg-pos-surface-muted/40 px-4 py-3 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-pos-ink">{role.name}</p>
                  <p className="text-[12px] text-pos-ink-faint">
                    {role.members} member{role.members === 1 ? "" : "s"} · {role.scope}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[12px] tabular-nums text-pos-ink-faint">
                  <div>{role.privileges} priv.</div>
                  <div>{role.departments} dept.</div>
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <section className="overflow-hidden rounded-[18px] border border-pos-border bg-pos-surface shadow-pos-sm">
        <div className="border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          Session activity
        </div>
        {sessions.recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-pos-ink-faint">No session events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-pos-border/60 bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/45">
                {sessions.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-pos-surface-muted/60">
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.account}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.action === "session.start"
                            ? "bg-pos-success/10 text-pos-success"
                            : "bg-pos-surface-muted text-pos-ink-faint"
                        }`}
                      >
                        {row.action === "session.start" ? "Signed in" : "Signed out"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-pos-ink-muted">{row.target || "—"}</td>
                    <td className="px-5 py-3 text-[12px] tabular-nums text-pos-ink-muted">
                      {new Date(row.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function AuditLogsPage() {
  const { live } = useLivePos();
  const { data, ready } = useOverview();
  if (!ready || !data) return <ManagerSkeleton variant="table" />;

  const audit = data.audit;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Audit logs"
        copy="Administrative actions and configuration changes."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Today" value={String(audit.today)} hint="Actions recorded" tone="accent" />
        <SetupStat label="This week" value={String(audit.week)} hint="All actions" />
        <SetupStat label="By producers" value={String(audit.producer)} hint="Super Admin actions" />
        <SetupStat label="By tenants" value={String(audit.tenant)} hint="Company admin actions" />
      </div>
      <section className="overflow-hidden rounded-[18px] border border-pos-border bg-pos-surface shadow-pos-sm">
        <div className="border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          Audit trail
        </div>
        {audit.recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-pos-ink-faint">
            No administrative actions recorded yet. Sign-ins, password changes, and account edits appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-pos-border/60 bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Detail</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/45">
                {audit.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-pos-surface-muted/60">
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.actor}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-semibold text-pos-ink">
                        {row.action.split(".").join(" ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-pos-ink-muted">{row.target || "—"}</td>
                    <td className="px-5 py-3 text-pos-ink-muted">{row.detail || "—"}</td>
                    <td className="px-5 py-3 text-[12px] tabular-nums text-pos-ink-muted">
                      {new Date(row.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SecurityEventsPage() {
  const colors = useThemeColors();
  const { live } = useLivePos();
  const { data, ready } = useOverview();
  if (!ready || !data) return <ManagerSkeleton variant="table" />;

  const events = data.events;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Security"
        title="Security events"
        copy="Detected anomalies, failed attempts, and security alerts."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Critical" value={String(events.critical)} hint="Needs attention" tone="inverse" />
        <SetupStat label="Warnings" value={String(events.warnings)} hint="Review recommended" />
        <SetupStat label="Info" value={String(events.info)} hint="Informational" tone="accent" />
        <SetupStat label="Open" value={String(events.open)} hint="Unresolved" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <ChartCard title="Open vs resolved">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Open", value: events.open, color: colors.warning },
                    { name: "Resolved", value: events.resolved, color: colors.success },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  <Cell key="open" fill={colors.warning} />
                  <Cell key="resolved" fill={colors.success} />
                </Pie>
                <Tooltip contentStyle={tooltipStyle(colors)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.warning }} /> Open · {events.open}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.success }} /> Resolved · {events.resolved}
            </span>
          </div>
        </ChartCard>

        <ChartCard title="By severity">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Critical", value: events.critical, color: colors.danger },
                  { name: "Warnings", value: events.warnings, color: colors.warning },
                  { name: "Info", value: events.info, color: colors.success },
                ]}
                margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke={colors.chartGrid} vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} width={32} stroke={colors.inkFaint} fontSize={11} allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value}`, "Events"]} contentStyle={tooltipStyle(colors)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {[
                    { name: "Critical", value: events.critical, color: colors.danger },
                    { name: "Warnings", value: events.warnings, color: colors.warning },
                    { name: "Info", value: events.info, color: colors.success },
                  ].map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <section className="overflow-hidden rounded-[18px] border border-pos-border bg-pos-surface shadow-pos-sm">
        <div className="border-b border-pos-border/60 px-5 py-4 text-[15px] font-semibold text-pos-ink">
          Security events
        </div>
        {events.recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-pos-ink-faint">
            No security events recorded. Failed sign-ins and administrative actions will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-pos-border/60 bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/45">
                {events.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-pos-surface-muted/60">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-pos-ink">
                        <SeverityDot severity={row.severity} /> {row.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.title}</td>
                    <td className="px-5 py-3 text-pos-ink-muted">{row.body || "—"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.resolved ? "bg-pos-success/10 text-pos-success" : "bg-pos-warning/10 text-pos-warning"
                        }`}
                      >
                        {row.resolved ? "Resolved" : "Open"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] tabular-nums text-pos-ink-muted">
                      {new Date(row.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
