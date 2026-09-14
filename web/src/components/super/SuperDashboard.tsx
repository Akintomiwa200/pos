"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Headphones,
  LogIn,
  Monitor,
  Plus,
  Receipt,
  ScrollText,
  Share2,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  getSecurityOverview,
  listSales,
  type HqSale,
  type SecurityOverview,
  type SecurityTrendPoint,
} from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";
import { useLivePos } from "@/lib/live-pos";
import { groupScope } from "@/lib/access";
import { compactMinor, formatMinor, useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "@/components/Skeleton";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Staff";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

function money(minor: number) {
  const whole = formatMinor(minor, 0);
  return whole.replace(/\s+/g, "").length > 14 ? compactMinor(minor) : formatMinor(minor, 2);
}

function timeAgo(iso: string) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "—";
  const seconds = Math.max(1, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return iso.slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setTime(next.getTime() + days * DAY_MS);
  return next;
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inRange(sale: HqSale, from: Date, to: Date) {
  const at = Date.parse(sale.paidAt);
  return Number.isFinite(at) && at >= from.getTime() && at <= to.getTime();
}

type PeriodId = "7d" | "30d" | "90d" | "thisMonth" | "lastMonth" | "12m" | "all";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "12m", label: "Last 12 months" },
  { id: "all", label: "All time" },
];

function boundsForPeriod(rows: HqSale[], period: PeriodId): { from: Date; to: Date } {
  const now = new Date();
  const today = startOfDay(now);
  switch (period) {
    case "7d":
      return { from: addDays(today, -6), to: endOfDay(now) };
    case "30d":
      return { from: addDays(today, -29), to: endOfDay(now) };
    case "90d":
      return { from: addDays(today, -89), to: endOfDay(now) };
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "12m":
      return { from: addDays(today, -364), to: endOfDay(now) };
    case "all": {
      const ats = rows.map((sale) => Date.parse(sale.paidAt)).filter(Number.isFinite);
      if (!ats.length) return { from: addDays(today, -89), to: endOfDay(now) };
      const min = new Date(Math.min(...ats));
      const max = new Date(Math.max(...ats));
      return { from: startOfDay(min), to: endOfDay(max) };
    }
  }
}

function boundsForCustom(fromIso: string, toIso: string): { from: Date; to: Date } {
  const [fromYear, fromMonth, fromDay] = fromIso.split("-").map(Number);
  const [toYear, toMonth, toDay] = toIso.split("-").map(Number);
  let from = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
  let to = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    return boundsForPeriod([], "90d");
  }
  if (from.getTime() > to.getTime()) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}

type AuthBucket = {
  label: string;
  success: number;
  failed: number;
  rate: number;
};

function bucketAuth(
  trend: SecurityTrendPoint[],
  from: Date,
  to: Date,
): { rows: AuthBucket[]; unit: "day" | "week" } {
  const map = new Map<string, SecurityTrendPoint>();
  for (const point of trend) map.set(point.date, point);
  const daily: { date: Date; success: number; failed: number }[] = [];
  let cursor = startOfDay(from);
  let guard = 0;
  while (cursor.getTime() <= to.getTime() && guard < 400) {
    const point = map.get(dayKey(cursor));
    daily.push({
      date: cursor,
      success: point?.success ?? 0,
      failed: point?.failed ?? 0,
    });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  const unit: "day" | "week" = daily.length <= 45 ? "day" : "week";
  if (unit === "day") {
    return {
      unit,
      rows: daily.map((row) => {
        const total = row.success + row.failed;
        return {
          label: row.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          success: row.success,
          failed: row.failed,
          rate: total ? Math.round((row.success / total) * 100) : 0,
        };
      }),
    };
  }
  const rows: AuthBucket[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    const success = chunk.reduce((sum, row) => sum + row.success, 0);
    const failed = chunk.reduce((sum, row) => sum + row.failed, 0);
    const total = success + failed;
    rows.push({
      label: chunk[0]!.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      success,
      failed,
      rate: total ? Math.round((success / total) * 100) : 0,
    });
  }
  return { rows, unit };
}

function revenueBuckets(
  rows: HqSale[],
  from: Date,
  to: Date,
): { buckets: { label: string; value: number }[]; unit: "day" | "month" } {
  const days = Math.round((endOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1;
  const unit: "day" | "month" = days <= 35 ? "day" : "month";
  const buckets: { label: string; value: number }[] = [];
  if (unit === "day") {
    let cursor = startOfDay(from);
    let guard = 0;
    while (cursor.getTime() <= to.getTime() && guard < 400) {
      const value = rows
        .filter((row) => inRange(row, cursor, endOfDay(cursor)))
        .reduce((sum, row) => sum + row.totalMinor, 0);
      buckets.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value,
      });
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  } else {
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    let guard = 0;
    while (cursor.getTime() <= to.getTime() && guard < 36) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      const coverStart = cursor.getTime() < from.getTime() ? from : cursor;
      const coverEnd = monthEnd.getTime() > to.getTime() ? to : monthEnd;
      const value = rows
        .filter((row) => inRange(row, coverStart, coverEnd))
        .reduce((sum, row) => sum + row.totalMinor, 0);
      buckets.push({
        label: cursor.toLocaleDateString("en-US", { month: "short" }),
        value,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      guard += 1;
    }
  }
  return { buckets, unit };
}

function groupBy<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = key(row) || "Other";
    map.set(id, (map.get(id) ?? 0) + amount(row));
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const pad = value * 1.18;
  const mag = 10 ** Math.floor(Math.log10(pad));
  return Math.ceil(pad / mag) * mag;
}

function Avatar({ name, size = 34, index = 0 }: { name: string; size?: number; index?: number }) {
  const { avatar } = useThemeColors();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size > 32 ? 12 : 10,
        background: avatar[index % avatar.length],
      }}
    >
      {initials(name)}
    </span>
  );
}

type KpiTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  href: string;
  tone?: "surface" | "primary";
};

function KpiTile({ icon: Icon, label, value, note, href, tone = "surface" }: KpiTileProps) {
  const inked = tone === "primary";
  return (
    <Link
      href={href}
      className={`flex min-h-[124px] flex-col rounded-[26px] p-5 shadow-pos-sm transition-transform hover:-translate-y-0.5 ${
        inked ? "bg-pos-primary text-white shadow-pos-primary" : "bg-pos-surface text-pos-ink"
      }`}
    >
      <span
        className={`grid size-9 place-items-center rounded-[12px] ${
          inked ? "bg-white/15 text-white" : "bg-pos-surface-muted text-pos-ink-muted"
        }`}
      >
        <Icon size={17} />
      </span>
      <span className={`mt-auto text-[13px] ${inked ? "text-white/55" : "text-pos-ink-faint"}`}>
        {label}
      </span>
      <span className="mt-0.5 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </span>
      <span className={`mt-1.5 truncate text-[12px] ${inked ? "text-white/45" : "text-pos-ink-faint"}`}>
        {note}
      </span>
    </Link>
  );
}

type AccessRowProps = {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
};

function AccessRow({ label, value, sub, icon: Icon }: AccessRowProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-pos-ink-faint">{label}</p>
        <p className="text-[15px] font-semibold leading-tight tabular-nums">{value}</p>
      </div>
      <span className="shrink-0 text-[12px] text-pos-ink-faint">{sub}</span>
    </div>
  );
}

function SparkBars({ points }: { points: { label: string; value: number }[] }) {
  const colors = useThemeColors();
  const max = Math.max(...points.map((point) => point.value), 1);
  const data = points.map((point, index) => ({
    ...point,
    stripe: index === points.length - 1,
  }));
  return (
    <div className="h-[64px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={16} isAnimationActive={false}>
            {data.map((point, index) => (
              <Cell
                key={`${point.label}-${index}`}
                fill={point.stripe ? colors.primary : colors.chartBar}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type AuthMetric = "success" | "failed" | "rate";

function AuthFlowChart({
  rows,
  unit,
}: {
  rows: AuthBucket[];
  unit: "day" | "week";
}) {
  const colors = useThemeColors();
  const [metric, setMetric] = useState<AuthMetric>("success");
  const counts = rows.reduce(
    (sum, row) => ({ success: sum.success + row.success, failed: sum.failed + row.failed }),
    { success: 0, failed: 0 },
  );
  const rate = counts.success + counts.failed
    ? Math.round((counts.success / (counts.success + counts.failed)) * 100)
    : 0;
  const data = rows.map((row) => ({
    label: row.label,
    a: metric === "failed" ? row.failed : metric === "rate" ? row.rate : row.success,
  }));
  const max = metric === "rate" ? 100 : niceMax(Math.max(1, ...data.map((row) => row.a)));
  const legends: { id: AuthMetric; label: string; value: string }[] = [
    { id: "success", label: "Successful logins", value: String(counts.success) },
    { id: "failed", label: "Blocked attempts", value: String(counts.failed) },
    { id: "rate", label: "Success rate", value: `${rate}%` },
  ];
  return (
    <div className="overflow-hidden rounded-[26px] bg-pos-surface shadow-pos-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-2">
        <div>
          <h2 className="text-[17px] font-semibold">Sign-in flow</h2>
          <p className="mt-0.5 text-[13px] text-pos-ink-faint">
            Authentication traffic · {unit === "week" ? "weekly buckets" : "per day"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {legends.map((legend) => (
            <button
              key={legend.id}
              type="button"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                metric === legend.id ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
              }`}
              onClick={() => setMetric(legend.id)}
            >
              <span className="tabular-nums">{legend.value}</span>
              <span>{legend.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="h-[210px] w-full">
          {rows.every((row) => row[metric] === 0 && metric !== "rate") ? (
            <div className="grid h-full place-items-center text-[13px] text-pos-ink-faint">
              No {metric === "failed" ? "blocked" : "successful"} logins in this period yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="superAuthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval={Math.ceil(rows.length / 7) - 1}
                  tick={{ fontSize: 11, fill: colors.inkFaint }}
                />
                <YAxis
                  orientation="left"
                  width={40}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, max]}
                  tick={{ fontSize: 11, fill: colors.inkFaint }}
                  tickFormatter={(value) => (metric === "rate" ? `${value}%` : String(value))}
                />
                <Area
                  type="monotone"
                  dataKey="a"
                  stroke={colors.primary}
                  strokeWidth={2.4}
                  fill="url(#superAuthGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function DistributionRow({
  name,
  amount,
  share,
  index,
}: {
  name: string;
  amount: number;
  share: number;
  index: number;
}) {
  const colors = useThemeColors();
  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        <Avatar name={name} size={24} index={index} />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{shortName(name)}</span>
        <span className="text-[13px] font-medium tabular-nums">{money(amount)}</span>
        <span className="w-12 text-right text-[12px] tabular-nums text-pos-ink-faint">{share.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(share, 0)}%`, background: colors.primary }}
        />
      </div>
    </div>
  );
}

function ShortcutRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-pos-surface-muted"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{label}</span>
      <span className="rounded-full bg-pos-primary-soft px-2.5 py-1 text-[12px] font-semibold tabular-nums text-pos-primary">
        {value}
      </span>
    </Link>
  );
}

type FeedItem = {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string | null;
  at: string;
  tone: "ok" | "info" | "warn" | "crit";
};

function buildFeed(security: SecurityOverview | null): FeedItem[] {
  const items: FeedItem[] = [];
  for (const row of security?.audit.recent ?? []) {
    items.push({
      id: `audit-${row.id}`,
      actor: row.actor,
      action: row.action,
      target: row.target,
      detail: row.detail,
      at: row.at,
      tone: "info",
    });
  }
  for (const row of security?.logins.recent ?? []) {
    items.push({
      id: `login-${row.id}`,
      actor: row.email,
      action: row.success ? "signed in" : "sign-in blocked",
      target: row.email,
      detail: row.reason,
      at: row.at,
      tone: row.success ? "ok" : "crit",
    });
  }
  for (const row of security?.sessions.recent ?? []) {
    items.push({
      id: `session-${row.id}`,
      actor: row.account,
      action: row.action,
      target: row.target,
      detail: null,
      at: row.at,
      tone: "info",
    });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8);
}

const DOT_TONE: Record<FeedItem["tone"], string> = {
  ok: "bg-pos-success",
  info: "bg-pos-ink-faint",
  warn: "bg-pos-warning",
  crit: "bg-pos-primary",
};

export function SuperDashboard() {
  useOrgLocale();
  const { accounts, groups, live: dirLive, ready: dirReady } = useLiveDirectory();
  const { stores, branches, tills, live: posLive, ready: posReady } = useLivePos();
  const [security, setSecurity] = useState<SecurityOverview | null>(null);
  const [sales, setSales] = useState<HqSale[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(first = false) {
      try {
        const [nextSecurity, nextSales] = await Promise.all([
          getSecurityOverview(),
          listSales(),
        ]);
        if (cancelled) return;
        setSecurity(nextSecurity);
        setSales(nextSales);
      } catch {
        /* keep last good snapshot */
      } finally {
        if (first && !cancelled) setDataReady(true);
      }
    }
    void load(true);
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!periodOpen) return;
    function onPointer(event: MouseEvent) {
      if (!periodRef.current?.contains(event.target as Node)) setPeriodOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPeriodOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [periodOpen]);

  const producerIds = useMemo(
    () => new Set(groups.filter((row) => groupScope(row) === "producer").map((row) => row.id)),
    [groups],
  );
  const tenantIds = useMemo(
    () => new Set(groups.filter((row) => groupScope(row) !== "producer").map((row) => row.id)),
    [groups],
  );
  const admins = accounts.filter((row) => producerIds.has(row.groupId));
  const users = accounts.filter((row) => tenantIds.has(row.groupId));
  const companyCount = new Set(users.map((row) => row.groupId)).size;
  const onlineTills = tills.filter((row) => row.online).length;
  const dueTills = tills.filter((row) => row.expired).length;
  const licensedTills = tills.filter((row) => Boolean(row.subscriptionExpiresAt)).length;

  const report = useMemo(() => {
    const bounds =
      customMode && customFrom && customTo
        ? boundsForCustom(customFrom, customTo)
        : boundsForPeriod(sales, period);
    const { from, to } = bounds;
    const span = to.getTime() - from.getTime() + 1;
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - span + 1);
    const current = sales.filter((row) => inRange(row, from, to));
    const previous = sales.filter((row) => inRange(row, prevFrom, prevTo));
    const revenue = current.reduce((sum, row) => sum + row.totalMinor, 0);
    const prevRevenue = previous.reduce((sum, row) => sum + row.totalMinor, 0);
    const delta = revenue - prevRevenue;
    const pct = prevRevenue ? (delta / prevRevenue) * 100 : current.length ? 100 : 0;
    const byStore = groupBy(current, (row) => row.storeName || "Main store", (row) => row.totalMinor);
    const spark = revenueBuckets(current, from, to);
    const auth = bucketAuth(security?.logins.trend ?? [], from, to);
    return { from, to, prevFrom, prevTo, revenue, prevRevenue, pct, delta, byStore, spark, auth };
  }, [sales, period, customMode, customFrom, customTo, security]);

  const feed = useMemo(() => buildFeed(security), [security]);
  const people = [...admins, ...users];
  const live = dirLive && posLive;
  const up = report.pct >= 0;
  const activePeriod = PERIODS.find((row) => row.id === period) ?? PERIODS[1]!;
  const storeTotal = report.byStore.reduce((sum, row) => sum + row.total, 0) || 1;

  async function sharePage() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Platform overview", url });
        toast.success("Report shared.");
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  if (!dataReady || !dirReady || !posReady) return <ManagerSkeleton variant="table" />;

  return (
    <div className="space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-pos-primary">Producer · Super Admin</p>
          <h1 className="mt-1 text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-none tracking-tight">
            Platform overview
          </h1>
          <p className="mt-2 max-w-[34rem] text-[14px] leading-relaxed text-pos-ink-muted">
            The network at a glance — companies, tills, people, and access. Pick a period to review
            revenue and sign-in traffic across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium ${
              live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
            }`}
          >
            {live ? <Wifi size={13} /> : <WifiOff size={13} />}
            {live ? "Live" : "Offline"}
          </span>
          <div className="relative" ref={periodRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-pos-surface px-3.5 py-2 text-[13px] font-medium shadow-pos-sm"
              onClick={() => setPeriodOpen((open) => !open)}
              aria-expanded={periodOpen}
            >
              <CalendarDays size={14} className="text-pos-ink-faint" />
              {activePeriod.label}
              <ChevronDown size={13} className="text-pos-ink-faint" />
            </button>
            {periodOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl bg-pos-surface py-1 shadow-pos-md">
                {PERIODS.map((row) => {
                  const active = !customMode && period === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                        active ? "bg-pos-primary-soft font-medium text-pos-primary" : "hover:bg-pos-surface-muted"
                      }`}
                      onClick={() => {
                        setPeriod(row.id);
                        setCustomMode(false);
                        setPeriodOpen(false);
                      }}
                    >
                      <span className="flex-1">{row.label}</span>
                      {active ? <Check size={14} strokeWidth={2.4} /> : null}
                    </button>
                  );
                })}
                <div className="mt-1 border-t border-pos-border/60 p-3">
                  <p className="text-[12px] font-medium">Custom range</p>
                  <div className="mt-2 space-y-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(event) => setCustomFrom(event.target.value)}
                      className="w-full rounded-lg border border-pos-border bg-pos-surface px-2 py-1.5 text-[13px] outline-none focus:border-pos-primary"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(event) => setCustomTo(event.target.value)}
                      className="w-full rounded-lg border border-pos-border bg-pos-surface px-2 py-1.5 text-[13px] outline-none focus:border-pos-primary"
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-xl bg-pos-primary px-3 py-2 text-[13px] font-medium text-white shadow-pos-primary"
                    onClick={() => {
                      if (customFrom && customTo) {
                        setCustomMode(true);
                        setPeriodOpen(false);
                      } else {
                        toast.info("Pick a start and end date first.");
                      }
                    }}
                  >
                    Apply dates
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full bg-pos-surface text-pos-ink shadow-pos-sm"
            aria-label="Share"
            onClick={() => void sharePage()}
          >
            <Share2 size={15} />
          </button>
          <Link
            href="/admin/companies/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-pos-primary px-4 py-2 text-[13px] font-medium text-white shadow-pos-primary"
          >
            <Plus size={14} strokeWidth={2.6} />
            New company
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={Building2}
          label="Companies"
          value={String(companyCount)}
          note={`${branches.length} branches · ${stores.length} stores`}
          href="/admin/companies"
        />
        <KpiTile
          icon={Monitor}
          label="Tills online"
          value={String(onlineTills)}
          note={`${tills.length} total · ${dueTills} due`}
          href="/admin/tills"
          tone="primary"
        />
        <KpiTile
          icon={Users}
          label="People"
          value={String(people.length)}
          note={`${admins.length} admins · ${users.length} users`}
          href="/admin/people/owners"
        />
        <KpiTile
          icon={Receipt}
          label="Active licences"
          value={String(licensedTills)}
          note="tills with a live subscription"
          href="/admin/billing/subscriptions"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="rounded-[26px] bg-pos-surface p-6 shadow-pos-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] text-pos-ink-faint">Revenue this period</p>
              <p className="mt-1 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-none tracking-tight tabular-nums">
                {money(report.revenue)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white ${
                  up ? "bg-pos-success" : "bg-pos-primary"
                }`}
              >
                {up ? <TrendingUp size={13} strokeWidth={2.6} /> : <TrendingDown size={13} strokeWidth={2.6} />}
                {Math.abs(report.pct).toFixed(1)}%
              </span>
              <span className="text-[12px] text-pos-ink-faint">
                {money(Math.abs(report.delta))} vs previous period
              </span>
            </div>
          </div>
          <div className="mt-5">
            <SparkBars points={report.spark.buckets} />
            <div className="mt-2 flex items-center justify-between text-[12px] text-pos-ink-faint">
              <span>
                {report.spark.unit === "month" ? "Monthly" : "Daily"} trend ·{" "}
                {report.auth.unit === "week" ? "weekly buckets" : "per day"}
              </span>
              <Link href="/admin/analytics" className="inline-flex items-center gap-1 font-medium text-pos-primary hover:underline">
                Detailed analytics
                <ArrowRight size={12} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] bg-pos-surface p-6 shadow-pos-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Access right now</h2>
            <Link href="/admin/security/sessions" className="text-[13px] font-medium text-pos-primary hover:underline">
              Sessions
            </Link>
          </div>
          <div className="mt-1 divide-y divide-pos-border/60">
            <AccessRow
              icon={Shield}
              label="Admins"
              value={String(admins.length)}
              sub={`${groups.length} groups`}
            />
            <AccessRow
              icon={Wifi}
              label="Active sessions"
              value={String(security?.sessions.active ?? 0)}
              sub={`${security?.sessions.unique ?? 0} unique`}
            />
            <AccessRow
              icon={LogIn}
              label="Logins today"
              value={String(security?.logins.today ?? 0)}
              sub={`${security?.logins.failed ?? 0} failed`}
            />
          </div>
        </div>
      </div>

      <AuthFlowChart rows={report.auth.rows} unit={report.auth.unit} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-[26px] bg-pos-surface p-6 shadow-pos-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Revenue by store</h2>
            <Link href="/admin/companies" className="text-[13px] font-medium text-pos-primary hover:underline">
              All companies
            </Link>
          </div>
          {report.byStore.length === 0 ? (
            <p className="py-8 text-[13px] text-pos-ink-faint">
              No store revenue yet — it appears once tills start posting.
            </p>
          ) : (
            <div className="divide-y divide-pos-border/60">
              {report.byStore.map((row, index) => (
                <DistributionRow
                  key={row.name}
                  name={row.name}
                  amount={row.total}
                  share={(row.total / storeTotal) * 100}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[26px] bg-pos-surface p-6 shadow-pos-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Console shortcuts</h2>
            <Link href="/admin/analytics" className="text-[13px] font-medium text-pos-primary hover:underline">
              Analytics
            </Link>
          </div>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            <ShortcutRow icon={Building2} label="Companies" value={String(companyCount)} href="/admin/companies" />
            <ShortcutRow icon={Monitor} label="Tills / POS" value={`${onlineTills}/${tills.length}`} href="/admin/tills" />
            <ShortcutRow icon={Receipt} label="Subscriptions" value={String(licensedTills)} href="/admin/billing/subscriptions" />
            <ShortcutRow icon={Users} label="Company owners" value={String(users.length)} href="/admin/people/owners" />
            <ShortcutRow icon={ScrollText} label="Audit today" value={String(security?.audit.today ?? 0)} href="/admin/security/audit" />
            <ShortcutRow icon={Shield} label="Security events" value={String(security?.events.open ?? 0)} href="/admin/security/events" />
            <ShortcutRow icon={Headphones} label="Support" value="—" href="/admin/support" />
            <ShortcutRow icon={BarChart3} label="Usage" value={money(report.revenue)} href="/admin/billing/usage" />
          </div>
        </div>
      </div>

      <div className="rounded-[26px] bg-pos-surface p-6 shadow-pos-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold">Recent activity</h2>
            <p className="mt-0.5 text-[13px] text-pos-ink-faint">
              Logins, audits, and session changes across the network.
            </p>
          </div>
          <Link
            href="/admin/activity"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-pos-primary hover:underline"
          >
            Full activity log
            <ArrowRight size={12} strokeWidth={2.4} />
          </Link>
        </div>
        {feed.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-pos-ink-faint">
            Nothing yet — the feed fills in as admins and users act on the platform.
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
            {feed.map((item) => (
              <FeedItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedItemRow({ item }: { item: FeedItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center">
        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT_TONE[item.tone]}`} />
        <span className="mt-1 w-px flex-1 bg-pos-border/70" />
      </div>
      <button type="button" className="min-w-0 flex-1 pb-2 text-left" onClick={() => setOpen((value) => !value)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Avatar name={item.actor} size={20} index={0} />
          <span className="text-[13px] font-semibold">{shortName(item.actor)}</span>
          <span className="text-[13px] text-pos-ink-muted">{item.action}</span>
          <span className="truncate text-[13px] text-pos-ink-faint">{item.target}</span>
          <span className="ml-auto shrink-0 text-[12px] tabular-nums text-pos-ink-faint">
            {timeAgo(item.at)}
          </span>
        </div>
        {item.detail ? (
          <span className="mt-1 block text-[12px] text-pos-ink-faint">
            {open ? "Hide details" : "Tap for details"}
          </span>
        ) : null}
        {open && item.detail ? (
          <p className="mt-2 rounded-xl bg-pos-surface-muted px-3 py-2 text-[13px] leading-relaxed text-pos-ink-muted">
            {item.detail}
          </p>
        ) : null}
      </button>
    </div>
  );
}