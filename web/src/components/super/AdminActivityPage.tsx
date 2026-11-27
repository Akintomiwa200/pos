"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CreditCard,
  Download,
  FileText,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  LiveBadge,
  SetupHeader,
  SetupStat,
} from "@/components/setup/SetupChrome";
import { getSecurityOverview, type SecurityOverview } from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";

type ActivityEvent = {
  id: string;
  actor: string;
  action: string;
  subject: string;
  group: string;
  at: string;
};

/** Build the feed from the audit, login and session records returned by the API. */
function buildEvents(security: SecurityOverview | null): ActivityEvent[] {
  const rows: ActivityEvent[] = [];
  for (const row of security?.audit.recent ?? []) {
    rows.push({
      id: `audit-${row.id}`,
      actor: row.actor,
      action: row.action.split(".").join(" "),
      subject: [row.target, row.detail].filter(Boolean).join(" · "),
      group: row.action.split(".")[0] || "audit",
      at: row.at,
    });
  }
  for (const row of security?.logins.recent ?? []) {
    rows.push({
      id: `login-${row.id}`,
      actor: row.email,
      action: row.success ? "signed in" : "sign-in blocked",
      subject: row.reason ?? "",
      group: "login",
      at: row.at,
    });
  }
  for (const row of security?.sessions.recent ?? []) {
    rows.push({
      id: `session-${row.id}`,
      actor: row.account,
      action: row.action.split(".").join(" "),
      subject: row.target,
      group: "session",
      at: row.at,
    });
  }
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

const GROUP_ICONS: Record<string, typeof Activity> = {
  login: Shield,
  session: Shield,
  role: Shield,
  account: Users,
  profile: Users,
  company: Users,
  invoice: CreditCard,
  plan: CreditCard,
};

function timestamp(iso: string) {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : at.toLocaleString();
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: ActivityEvent[]) {
  const lines = [
    ["When", "Category", "Actor", "Action", "Details"].map(csvCell).join(","),
    ...rows.map((row) =>
      [timestamp(row.at), row.group, row.actor, row.action, row.subject]
        .map(csvCell)
        .join(","),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function useAuditActivity() {
  const { session } = useAuth();
  const [security, setSecurity] = useState<SecurityOverview | null>(null);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const data = await getSecurityOverview();
        if (!cancelled) setSecurity(data);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    const token = session?.token ?? "";
    const source = token
      ? new EventSource(`/api/console/security/stream?token=${encodeURIComponent(token)}`)
      : null;
    if (source) {
      source.onopen = () => {
        if (!cancelled) setLive(true);
      };
      source.onerror = () => {
        if (!cancelled) setLive(false);
      };
      source.onmessage = () => {
        if (!cancelled) void refresh();
      };
    }

    void refresh();
    return () => {
      cancelled = true;
      source?.close();
    };
  }, [session?.token]);

  return { security, ready, live };
}

export function AdminActivityPage() {
  const { accounts, groups, ready: dirReady } = useLiveDirectory();
  const { security, ready: auditReady, live } = useAuditActivity();
  const [group, setGroup] = useState("All");

  if (!dirReady || !auditReady) return <ManagerSkeleton variant="table" />;

  const producerIds = new Set(groups.filter((g) => g.scope === "producer").map((g) => g.id));
  const producerCount = accounts.filter((a) => producerIds.has(a.groupId)).length;
  const tenantCount = accounts.filter((a) => !producerIds.has(a.groupId)).length;

  const events = buildEvents(security);
  const categories = ["All", ...Array.from(new Set(events.map((event) => event.group)))];
  const filtered = group === "All" ? events : events.filter((event) => event.group === group);

  return (
    <div>
      <SetupHeader
        kicker="Producer · Super Admin"
        title="Admin activity"
        copy="Audit trail of recorded admin actions, sign-ins and session changes. Filter by category and export the current view."
        action={
          <div className="flex items-center gap-2">
            <LiveBadge live={live} label={live ? "Live · Activity log" : "Activity log"} />
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-3 py-2.5 text-[12px] font-medium text-pos-ink-muted transition hover:text-pos-ink disabled:opacity-50"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Admins" value={String(producerCount)} hint="Super Admin accounts" tone="accent" />
        <SetupStat label="Tenants" value={String(tenantCount)} hint="Tenant accounts" />
        <SetupStat label="Roles" value={String(groups.filter((g) => g.scope === "producer").length)} hint="Admin groups" />
        <SetupStat label="Events" value={String(events.length)} hint="Recent records" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setGroup(item)}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold capitalize transition ${
              group === item
                ? "bg-pos-primary text-white shadow-pos-primary"
                : "bg-pos-surface text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            {item === "All" ? "All categories" : item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Activity size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No activity events recorded in this category yet.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 hidden w-px bg-pos-border sm:block" />
          <ul className="space-y-1">
            {filtered.map((event) => {
              const Icon = GROUP_ICONS[event.group] ?? FileText;
              return (
                <li key={event.id} className="flex gap-4 px-1 py-3">
                  <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-[13px] bg-pos-primary/10 text-pos-primary ring-2 ring-pos-surface">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-pos-ink">
                      <span className="font-semibold">{event.actor || "System"}</span>{" "}
                      <span className="text-pos-ink-muted">{event.action}</span>{" "}
                      <span className="font-medium">{event.subject}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-pos-ink-faint">{timestamp(event.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
