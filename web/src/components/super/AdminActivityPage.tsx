"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Filter,
  Key,
  Megaphone,
  RefreshCw,
  Settings,
  Shield,
  User,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLiveDirectory } from "@/lib/live-directory";
import { useLivePos } from "@/lib/live-pos";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  SetupStat,
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

type ActivityEvent = {
  id: number;
  actor: string;
  action: string;
  subject: string;
  icon: typeof Activity;
  group: string;
  at: string;
};

const SAMPLE_EVENTS: ActivityEvent[] = [
  { id: 1, actor: "System", action: "signed in", subject: "API key created for staging environment", icon: Key, group: "security", at: "Today · 14:02" },
  { id: 2, actor: "Super Admin", action: "created company", subject: "Acme Warehouse Ltd. was onboarded", icon: FileText, group: "company", at: "Today · 13:48" },
  { id: 3, actor: "Super Admin", action: "published", subject: "Announcement: Platform maintenance scheduled", icon: Megaphone, group: "support", at: "Today · 13:30" },
  { id: 4, actor: "Super Admin", action: "flagged", subject: "Feature flag toggle: crm.tickets flipped OFF", icon: Settings, group: "system", at: "Today · 13:15" },
  { id: 5, actor: "Super Admin", action: "approved", subject: "OAuth application: Analytics Sync connected", icon: Shield, group: "developer", at: "Today · 12:58" },
  { id: 6, actor: "Super Admin", action: "revoked", subject: "API key pos_live_7f… revoked for decommission", icon: Key, group: "security", at: "Yesterday · 22:10" },
  { id: 7, actor: "Super Admin", action: "added role", subject: "Role group: Producer · Read Only created", icon: Users, group: "directory", at: "Yesterday · 20:45" },
  { id: 8, actor: "Super Admin", action: "created account", subject: "Admin account for muiz@demo.com created", icon: User, group: "directory", at: "Yesterday · 19:30" },
];

const GROUP_ICONS: Record<string, string> = {
  security: "bg-pos-danger/10 text-pos-danger",
  company: "bg-pos-primary/10 text-pos-primary",
  support: "bg-pos-primary/10 text-pos-primary",
  system: "bg-pos-primary/10 text-pos-primary",
  developer: "bg-pos-primary/10 text-pos-primary",
  directory: "bg-pos-primary/10 text-pos-primary",
};

const FILTERS = ["All", "security", "company", "directory", "system", "support", "developer"];

export function AdminActivityPage() {
  const { live, ready: dirReady } = useLiveDirectory();
  const { accounts, groups } = useLiveDirectory();
  const { ready: posReady } = useLivePos();

  const [group, setGroup] = useState("All");

  if (!dirReady || !posReady) return <ManagerSkeleton variant="table" />;

  const producerIds = new Set(groups.filter((g) => g.scope === "producer").map((g) => g.id));
  const producerCount = accounts.filter((a) => producerIds.has(a.groupId)).length;
  const tenantCount = accounts.filter((a) => !producerIds.has(a.groupId)).length;

  const events = SAMPLE_EVENTS.filter((e) => (group === "All" ? true : e.group === group));

  return (
    <div>
      <SetupHeader
        kicker="Producer · Super Admin"
        title="Admin activity"
        copy="Audit trail of every action taken by Super Admin staff across the platform. Filter by category and export for compliance."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Admins" value={String(producerCount)} hint="Super Admin accounts" tone="accent" />
        <SetupStat label="Tenants" value={String(tenantCount)} hint="Tenant accounts" />
        <SetupStat label="Roles" value={String(groups.filter((g) => g.scope === "producer").length)} hint="Admin groups" />
        <SetupStat label="Events" value={String(SAMPLE_EVENTS.length)} hint="Since last export" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setGroup(f)}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold capitalize transition ${
              group === f
                ? "bg-pos-primary text-white shadow-pos-primary"
                : "bg-pos-surface text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            {f === "All" ? "All categories" : f}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Activity size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No activity events in this category yet.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 hidden w-px bg-pos-border sm:block" />
          <ul className="space-y-1">
            {events.map((event) => {
              const Icon = event.icon;
              const iconTone = GROUP_ICONS[event.group] || "bg-pos-surface-muted text-pos-ink-faint";
              return (
                <li key={event.id} className="flex gap-4 px-1 py-3">
                  <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-[13px] ring-2 ring-pos-surface ${iconTone}`}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-pos-ink">
                      <span className="font-semibold">{event.actor}</span>{" "}
                      <span className="text-pos-ink-muted">{event.action}</span>{" "}
                      <span className="font-medium">{event.subject}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-pos-ink-faint">{event.at}</p>
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