"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  BarChart3,
  ChevronDown,
  CreditCard,
  Link2,
  Menu,
  Package,
  Plus,
  Share2,
  SlidersHorizontal,
  Star,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  listAccounts,
  listCatalog,
  listSales,
  type HqCatalogItem,
  type HqSale,
} from "../lib/hq-api";
import type { ConsoleAccount } from "../lib/access";
import { useThemeColors } from "../hooks/useThemeColors";
import { useAuth } from "./AuthProvider";
import { DashboardSkeleton } from "./Skeleton";

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

function samePerson(a: string, b: string) {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.replace(/\s+/g, "") === right.replace(/\s+/g, "")) return true;
  const short = left.length <= 4 || right.length <= 4;
  return short && initials(a) === initials(b);
}

function fillCashierBar(
  cashiers: NamedTotal[],
  accounts: { name: string }[],
  slots = 4,
): NamedTotal[] {
  const rows: NamedTotal[] = [];
  const take = (name: string, total: number) => {
    if (rows.some((row) => samePerson(row.name, name))) return;
    rows.push({ name, total });
  };
  for (const row of cashiers) {
    const account = accounts.find((item) => samePerson(item.name, row.name));
    take(account?.name ?? row.name, row.total);
  }
  for (const account of accounts) {
    if (rows.length >= slots) break;
    const hit = cashiers.find((row) => samePerson(row.name, account.name));
    take(account.name, hit?.total ?? 0);
  }
  return rows.slice(0, slots);
}

function naira(minor: number) {
  return (minor / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  });
}

function nairaWhole(minor: number) {
  return (minor / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });
}

function firstName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean)[0] || name;
}

function compact(minor: number) {
  const value = minor / 100;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}tn`;
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}bn`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

function displayMoney(minor: number) {
  const whole = nairaWhole(minor);
  return whole.replace(/\s/g, "").length > 14 ? `₦${compact(minor)}` : whole;
}

function moneyClass(text: string, kind: "hero" | "card" | "rail" | "cell" | "tile") {
  const n = text.length;
  if (kind === "hero") {
    if (n > 16) return "text-[18px] sm:text-[22px]";
    if (n > 13) return "text-[26px] sm:text-[32px]";
    if (n > 11) return "text-[34px]";
    return "text-[42px]";
  }
  if (kind === "card") {
    if (n > 14) return "text-[16px]";
    if (n > 11) return "text-[20px]";
    return "text-[28px]";
  }
  if (kind === "rail") {
    if (n > 14) return "text-[13px]";
    if (n > 11) return "text-[16px]";
    return "text-[24px]";
  }
  if (kind === "tile") {
    if (n > 10) return "text-[14px]";
    if (n > 8) return "text-[18px]";
    return "text-[22px]";
  }
  if (n > 14) return "text-[11px]";
  if (n > 12) return "text-[12px]";
  return "text-[14px]";
}

function FitMoney({
  minor,
  kind,
  className = "",
}: {
  minor: number;
  kind: "hero" | "card" | "rail" | "cell" | "tile";
  className?: string;
}) {
  const text = displayMoney(minor);
  return (
    <span
      className={`block min-w-0 max-w-full truncate font-semibold leading-none tracking-tight tabular-nums ${moneyClass(text, kind)} ${className}`}
      title={naira(minor)}
    >
      {text}
    </span>
  );
}

function rangeLabel(from: Date, to: Date) {
  const start = from.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = to.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
}

function inRange(sale: HqSale, from: Date, to: Date) {
  const at = Date.parse(sale.paidAt);
  return Number.isFinite(at) && at >= from.getTime() && at <= to.getTime();
}

function Avatar({ name, size = 36, index = 0 }: { name: string; size?: number; index?: number }) {
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

const TENDERS = [
  { id: "cash", name: "Cash", match: /cash/i, Icon: Banknote },
  { id: "card", name: "Card", match: /card|pos|credit/i, Icon: CreditCard },
  { id: "transfer", name: "Transfer", match: /transfer|bank/i, Icon: ArrowLeftRight },
  { id: "wallet", name: "Wallet", match: /wallet|opay|palmpay|kuda/i, Icon: Wallet },
] as const;

type TenderId = (typeof TENDERS)[number]["id"];

function tenderColors(id: TenderId, colors: ReturnType<typeof useThemeColors>) {
  if (id === "card") return { bg: colors.primarySoft, fg: colors.primary };
  return { bg: colors.surfaceMuted, fg: colors.inkMuted };
}

function tenderIdOf(name: string): TenderId | "other" {
  const hit = TENDERS.find((row) => row.match.test(name));
  return hit?.id ?? "other";
}

function asTenderId(name: string): TenderId {
  const id = tenderIdOf(name);
  return id === "other" ? "cash" : id;
}

function tenderTotal(tenders: { name: string; total: number }[], id: TenderId) {
  return tenders
    .filter((row) => tenderIdOf(row.name) === id)
    .reduce((sum, row) => sum + row.total, 0);
}

function MenuItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`block w-full px-4 py-2 text-left text-sm text-pos-ink ${
        active ? "bg-pos-primary-soft font-medium text-pos-primary" : "hover:bg-pos-surface-muted"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PillMenu({
  align = "right",
  trigger,
  children,
}: {
  align?: "left" | "right";
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <div onClick={() => setOpen((value) => !value)}>{trigger}</div>
      {open ? (
        <div
          className={`absolute z-20 mt-1 min-w-[168px] overflow-hidden rounded-2xl bg-pos-surface py-1 shadow-pos-md ${
            align === "left" ? "left-0" : "right-0"
          }`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function expiryState(expiresAt?: string) {
  if (!expiresAt) return "ok";
  const at = Date.parse(expiresAt);
  if (!Number.isFinite(at)) return "ok";
  const days = Math.ceil((at - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "expired";
  if (days <= 7) return "soon";
  return "ok";
}

function ExpiredStockCard({ items }: { items: HqCatalogItem[] }) {
  const router = useRouter();
  const colors = useThemeColors();
  const [scope, setScope] = useState<"expired" | "soon">("expired");
  const [metric, setMetric] = useState<"qty" | "value">("qty");
  const tones: Array<"fog" | "mist" | "stripe"> = ["fog", "mist", "fog", "stripe"];
  const rows = items
    .filter((item) => item.onHand > 0 && expiryState(item.expiresAt) === scope)
    .map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.onHand,
      value: item.onHand * item.priceMinor,
    }))
    .sort((a, b) => (metric === "value" ? b.value - a.value : b.qty - a.qty));
  const source = Array.from({ length: 4 }, (_, index) => rows[index] ?? null);
  const values = source.map((row) => (row ? (metric === "value" ? row.value : row.qty) : 0));
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-full min-h-[292px] flex-col rounded-[28px] bg-pos-surface p-5 shadow-pos-sm">
      <div className="flex items-center justify-between">
        <PillMenu align="left" trigger={<MenuPill icon={BarChart3} />}>
          <MenuItem label="Expiry report" onClick={() => router.push("/reports/stock/expiry")} />
          <MenuItem label="Stock balance" onClick={() => router.push("/reports/stock/balance")} />
        </PillMenu>
        <PillMenu trigger={<FilterPill />}>
          <MenuItem label="Expired" active={scope === "expired"} onClick={() => setScope("expired")} />
          <MenuItem label="Expiring soon" active={scope === "soon"} onClick={() => setScope("soon")} />
          <MenuItem label="On hand" active={metric === "qty"} onClick={() => setMetric("qty")} />
          <MenuItem label="Stock value" active={metric === "value"} onClick={() => setMetric("value")} />
        </PillMenu>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 items-end gap-2">
        {source.map((row, index) => {
          const value = values[index] ?? 0;
          const height = 72 + Math.round((value / max) * 60);
          const tone = tones[index] ?? "fog";
          const fill =
            tone === "fog"
              ? colors.chartGrid
              : tone === "mist"
                ? colors.chartBar
                : `repeating-linear-gradient(135deg, ${colors.chartSlice4} 0 8px, ${colors.chartBarAccent} 8px 16px)`;
          const iconTop = tone !== "stripe";
          return (
            <button
              key={row?.id ?? `empty-${index}`}
              type="button"
              className={`flex min-w-0 flex-1 ${iconTop ? "flex-col items-center pt-2.5" : "items-center justify-center"} rounded-[22px]`}
              style={{ height, background: fill }}
              title={
                row
                  ? `${row.name} · ${metric === "value" ? displayMoney(row.value) : `${row.qty} on hand`}`
                  : "No expired items"
              }
              onClick={() => router.push("/reports/stock/expiry")}
            >
              {row ? (
                <Avatar name={row.name} size={26} index={index} />
              ) : (
                <Package size={16} className="text-pos-ink-faint/60" />
              )}
            </button>
          );
        })}
      </div>
      <PillMenu
        align="left"
        trigger={
          <button type="button" className="mt-3 text-left text-[13px] leading-[1.25] text-pos-ink-faint">
            <span className="block">{metric === "value" ? "Stock value" : "Expired stock"}</span>
            <span className="flex items-center gap-0.5">
              {scope === "soon" ? "by item expiring" : "by expired item"}
              <ChevronDown size={14} strokeWidth={2} />
            </span>
          </button>
        }
      >
        <MenuItem label="Expired" active={scope === "expired"} onClick={() => setScope("expired")} />
        <MenuItem label="Expiring soon" active={scope === "soon"} onClick={() => setScope("soon")} />
        <MenuItem label="On hand" active={metric === "qty"} onClick={() => setMetric("qty")} />
        <MenuItem label="Stock value" active={metric === "value"} onClick={() => setMetric("value")} />
      </PillMenu>
    </div>
  );
}

function TenderIcon({ id, size = 40 }: { id: string; size?: number }) {
  const colors = useThemeColors();
  const meta = TENDERS.find((row) => row.id === id) ?? TENDERS[0]!;
  const Icon = meta.Icon as LucideIcon;
  const glyph = Math.round(size * 0.48);
  const { bg, fg } = tenderColors(meta.id, colors);
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        borderRadius: Math.max(8, Math.round(size * 0.28)),
      }}
    >
      <Icon size={glyph} strokeWidth={2} />
    </span>
  );
}

function CountPill({
  value,
  tone = "pink",
}: {
  value: number;
  tone?: "pink" | "black" | "green";
}) {
  const colors = useThemeColors();
  const background =
    tone === "black" ? colors.ink : tone === "green" ? colors.success : colors.primary;
  return (
    <span
      className="inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
      style={{ background }}
    >
      {value}
    </span>
  );
}

function FilterPill({ label = "Filters" }: { label?: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-3 py-1.5 text-xs font-medium text-pos-ink-muted"
    >
      <SlidersHorizontal size={12} strokeWidth={2} />
      {label}
      <ChevronDown size={12} strokeWidth={2} />
    </button>
  );
}

function MenuPill({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded-full bg-pos-surface-muted px-2.5 py-1.5 text-pos-ink-muted"
    >
      <Icon size={14} strokeWidth={1.8} />
      <ChevronDown size={12} strokeWidth={2} />
    </button>
  );
}

function PeakPill({
  x,
  y,
  value,
  payload,
  format = "money",
}: {
  x?: number;
  y?: number;
  value?: number | string;
  payload?: { a?: number; b?: number; c?: number };
  format?: "money" | "count" | "pct";
}) {
  const colors = useThemeColors();
  const amount = Number(value);
  if (x == null || y == null || !amount) return null;
  const peak = Math.max(payload?.a ?? 0, payload?.b ?? 0, payload?.c ?? 0);
  if (amount !== peak) return null;
  const label =
    format === "pct"
      ? `${amount}%`
      : format === "count"
        ? String(amount)
        : `₦${compact(amount)}`;
  const width = Math.max(54, label.length * 6.6);
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-width / 2} y={-26} width={width} height={18} rx={9} fill={colors.primary} />
      <text x={0} y={-13} textAnchor="middle" fill={colors.surface} fontSize={10} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const pad = value * 1.15;
  const mag = 10 ** Math.floor(Math.log10(pad));
  return Math.ceil(pad / mag) * mag;
}

function PlatformMonthChart({
  months,
  people,
  focus,
}: {
  months: Array<{
    month: string;
    a: number;
    b: number;
    c: number;
    ta: number;
    tb: number;
    tc: number;
    ma: number;
    mb: number;
    mc: number;
    people: { name: string }[];
  }>;
  people: { name: string }[];
  focus: "revenue" | "tickets" | "mix";
}) {
  const colors = useThemeColors();
  const faces = people.length
    ? people
    : [{ name: "Ada O" }, { name: "Ben K" }, { name: "Cam L" }];
  const data = months.map((row, index) => ({
    month: row.month,
    a: focus === "tickets" ? row.ta : focus === "mix" ? row.ma : row.a,
    b: focus === "tickets" ? row.tb : focus === "mix" ? row.mb : row.b,
    c: focus === "tickets" ? row.tc : focus === "mix" ? row.mc : row.c,
    stripe: index === 1 ? 0 : 1,
    faces: Math.max(1, Math.min(3, row.people.length || faces.length)),
    people: row.people.length ? row.people : faces,
  }));
  const max = niceMax(Math.max(...data.flatMap((row) => [row.a, row.b, row.c]), 1));
  const format = focus === "tickets" ? "count" : focus === "mix" ? "pct" : "money";
  const ticks = [max * 0.28, max * 0.52, max * 0.76, max].map((value) => Math.round(value));
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-end px-2 pb-3 pt-1">
      <div className="h-[188px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={5}
            barCategoryGap="26%"
            margin={{ top: 26, right: 6, left: 4, bottom: 0 }}
          >
            <defs>
              <pattern
                id="hq-stripe-month"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="10" height="10" fill={colors.chartGrid} />
                <rect width="5" height="10" fill={colors.chartBarAccent} />
              </pattern>
            </defs>
            <YAxis
              orientation="right"
              domain={[0, max]}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              width={56}
              tick={{ fontSize: 11, fill: colors.inkFaint }}
              tickFormatter={(value) =>
                format === "pct"
                  ? `${value}%`
                  : format === "count"
                    ? String(value)
                    : `₦${compact(Number(value))}`
              }
            />
            <XAxis dataKey="month" hide />
            <Bar dataKey="a" radius={[14, 14, 14, 14]} maxBarSize={24} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={`${row.month}-a`} fill={row.stripe === 0 ? "url(#hq-stripe-month)" : colors.chartBar} />
              ))}
              <LabelList dataKey="a" content={<PeakPill format={format} />} />
            </Bar>
            <Bar dataKey="b" radius={[14, 14, 14, 14]} maxBarSize={24} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={`${row.month}-b`} fill={row.stripe === 1 ? "url(#hq-stripe-month)" : colors.chartBar} />
              ))}
              <LabelList dataKey="b" content={<PeakPill format={format} />} />
            </Bar>
            <Bar dataKey="c" radius={[14, 14, 14, 14]} maxBarSize={24} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={`${row.month}-c`} fill={colors.chartBarAccent} />
              ))}
              <LabelList dataKey="c" content={<PeakPill format={format} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 grid grid-cols-3 pr-[56px]">
        {data.map((row) => (
          <div key={row.month} className="flex flex-col items-center">
            <div className="flex -space-x-1.5">
              {(row.people ?? faces).slice(0, row.faces).map((person, index) => (
                <Avatar key={`${row.month}-${person.name}`} name={person.name} size={20} index={index} />
              ))}
            </div>
            <span className="mt-1 text-[12px] text-pos-ink-faint">{row.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type NamedTotal = { name: string; total: number };

function SalesWaveDot({
  cx,
  cy,
  index = 0,
  people,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  people: { name: string }[];
}) {
  const colors = useThemeColors();
  if (cx == null || cy == null) return null;
  const person = people[index % Math.max(people.length, 1)];
  if (person && (index === 4 || index === 6 || index === 10)) {
    return (
      <foreignObject x={cx - 11} y={cy - 11} width={22} height={22}>
        <Avatar name={person.name} size={22} index={index} />
      </foreignObject>
    );
  }
  if (index === 2 || index === 8) {
    return <circle cx={cx} cy={cy} r={4} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />;
  }
  return <g />;
}

function SalesDynamicChart({
  weeks,
  people,
}: {
  weeks: { week: string; value: number; tickets: number }[];
  people: { name: string }[];
}) {
  const colors = useThemeColors();
  const data = weeks.map((row) => ({
    week: row.week.replace(/^W/, "W "),
    a: row.value,
    b: Math.round(row.value * 0.72),
  }));
  const wins = weeks.reduce((sum, row) => sum + row.tickets, 0);
  return (
    <div className="mt-4">
      <p className="text-[14px] font-medium">Sales dynamic</p>
      <div className="mt-1 h-[118px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 11, fill: colors.inkFaint }}
              tickFormatter={(value) => {
                const week = Number(String(value).replace(/\D/g, ""));
                return week % 2 === 1 ? `W ${week}` : "";
              }}
            />
            <Line
              type="monotone"
              dataKey="b"
              stroke={colors.chartLineSoft}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="a"
              stroke={colors.primary}
              strokeWidth={2.6}
              isAnimationActive={false}
              dot={(props) => (
                <SalesWaveDot
                  key={String(props.index)}
                  cx={props.cx}
                  cy={props.cy}
                  index={props.index}
                  people={people}
                />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="relative mt-7 h-2.5 rounded-full bg-pos-border">
        {[
          { left: "16%", value: Math.max(weeks[2]?.tickets ?? 0, 0), tone: colors.avatar[0], name: people[0]?.name, face: 0 },
          { left: "48%", value: Math.max(weeks[5]?.tickets ?? 0, 0), tone: colors.avatar[1], name: people[1]?.name, face: 1 },
          { left: "82%", value: Math.max(weeks[9]?.tickets ?? wins, 0), tone: colors.primary, name: people[2]?.name ?? people[0]?.name, face: 2 },
        ].map((mark) => (
          <span
            key={mark.left}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: mark.left }}
          >
            <span className="relative block">
              <span
                className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white"
                style={{ background: mark.tone }}
              >
                {mark.value}
              </span>
              {mark.name ? (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Avatar name={mark.name} size={16} index={mark.face} />
                </span>
              ) : null}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SalesTeamCard({
  cashiers,
  ticketsByCashier,
  linesByCashier,
  sales,
  weeks,
  revenue,
  selected,
  onSelect,
}: {
  cashiers: NamedTotal[];
  ticketsByCashier: NamedTotal[];
  linesByCashier: NamedTotal[];
  sales: HqSale[];
  weeks: { week: string; value: number; tickets: number }[];
  revenue: number;
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const colors = useThemeColors();
  const openName = selected || cashiers[0]?.name || null;
  return (
    <div className="h-full rounded-[28px] bg-pos-surface p-5 shadow-pos-sm">
      <div className="grid grid-cols-[1.45fr_1fr_0.75fr_0.5fr_1.2fr] gap-2 px-1 text-[12px] text-pos-ink-faint">
        <span>Sales</span>
        <span>Revenue</span>
        <span>Leads</span>
        <span>KPI</span>
        <span>W/L</span>
      </div>
      <div className="mt-2 space-y-1">
        {cashiers.length === 0 ? (
          <p className="px-1 py-6 text-sm text-pos-ink-faint">Cashiers show here after sales post to HQ.</p>
        ) : (
          cashiers.map((row, index) => {
            const leadCount = ticketsByCashier.find((item) => item.name === row.name)?.total ?? 0;
            const pipeline = linesByCashier.find((item) => item.name === row.name)?.total ?? leadCount;
            const kpi = pipeline ? leadCount / pipeline : 0;
            const mix = revenue ? Math.round((row.total / revenue) * 100) : 0;
            const mine = sales.filter((sale) => (sale.cashierName || "Till") === row.name);
            const wins = mine.filter((sale) => /card|pos|transfer|wallet/i.test(sale.tender)).length;
            const losses = Math.max(leadCount - wins, 0);
            const panel = openName === row.name;
            const tenders = sumBy(mine, (sale) => sale.tender || "Other", (sale) => sale.totalMinor);
            const tenderTotalAll = tenders.reduce((sum, item) => sum + item.total, 0) || 1;
            const primary = tenders[0] ?? { name: "Cash", total: 0 };
            const second = tenders[1] ?? { name: "Card", total: 0 };
            const third = tenders[2] ?? { name: "Transfer", total: 0 };
            const leftover = tenders.slice(3);
            const thirdExtra = leftover[0] ?? { name: "Wallet", total: 0 };
            const otherTotal = leftover.slice(1).reduce((sum, item) => sum + item.total, 0);
            const otherShare = (otherTotal / tenderTotalAll) * 100;
            const padDonut = tenders.length === 0;
            const donut = [
              { name: primary.name, value: padDonut ? 45 : Math.max(primary.total, 0), fill: colors.primary },
              { name: second.name, value: padDonut ? 28 : Math.max(second.total, 0), fill: colors.ink },
              { name: third.name, value: padDonut ? 14 : Math.max(third.total, 0), fill: colors.chartSlice2 },
              { name: thirdExtra.name, value: padDonut ? 5 : Math.max(thirdExtra.total, 0), fill: colors.chartSlice3 },
              { name: "Other", value: padDonut ? 8 : Math.max(otherTotal, 0), fill: colors.chartSlice4 },
            ].filter((slice) => slice.value > 0);
            const myWeeks = weeks.map((week, weekIndex) => {
              const to = new Date();
              const end = new Date(to.getTime() - (10 - weekIndex) * 7 * 24 * 60 * 60 * 1000);
              const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
              const rows = mine.filter((sale) => inRange(sale, start, end));
              return {
                week: week.week,
                value: rows.reduce((sum, sale) => sum + sale.totalMinor, 0),
                tickets: rows.length,
              };
            });
            const primaryShare = (primary.total / tenderTotalAll) * 100;
            const primaryId = tenderIdOf(primary.name);
            const secondId = tenderIdOf(second.name);
            const thirdId = tenderIdOf(third.name);
            return (
              <div
                key={row.name}
                className={panel ? "rounded-[24px] bg-pos-primary-soft p-2" : ""}
              >
                <button
                  type="button"
                  className="grid w-full grid-cols-[1.45fr_1fr_0.75fr_0.5fr_1.2fr] items-center gap-2 rounded-2xl px-1 py-2 text-left hover:bg-pos-surface-muted"
                  onClick={() => onSelect(row.name)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={row.name} size={32} index={index} />
                    <span className="truncate text-[14px] font-medium">{shortName(row.name)}</span>
                  </span>
                  <span className="text-[14px] tabular-nums min-w-0">
                    <FitMoney minor={row.total} kind="cell" />
                  </span>
                  <span className="text-[14px] tabular-nums">
                    <span className="font-medium">{leadCount}</span>{" "}
                    <span className="text-pos-ink-faint">{pipeline}</span>
                  </span>
                  <span className="text-[14px] tabular-nums">{kpi.toFixed(2)}</span>
                  <span className="flex items-center gap-1.5 text-[13px] text-pos-ink-faint">
                    {mix}%
                    <CountPill value={wins || leadCount} tone={index === cashiers.length - 1 ? "green" : "pink"} />
                    <CountPill value={losses} tone="black" />
                    {panel ? <ArrowUp size={14} strokeWidth={2.6} className="text-pos-primary" /> : null}
                  </span>
                </button>
                {panel ? (
                  <div className="px-1 pb-2 pt-1">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-pos-primary px-2.5 py-1 text-[11px] text-white">
                        Top sales 💪
                      </span>
                      <span className="rounded-full bg-pos-surface px-2.5 py-1 text-[11px] text-pos-ink">Sales streak 🔥</span>
                      <span className="rounded-full bg-pos-surface px-2.5 py-1 text-[11px] text-pos-ink">Top review 👍</span>
                    </div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-[14px] font-medium">Work with platforms</p>
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-pos-primary px-1 text-[11px] font-semibold text-white">
                          3
                        </span>
                        <span className="rounded-full bg-pos-surface px-2.5 py-1 text-[12px] font-medium tabular-nums text-pos-ink">
                          <FitMoney minor={row.total} kind="cell" />
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                      <div className="rounded-[20px] bg-pos-surface p-3 shadow-pos-sm">
                        <div className="mb-1 flex items-center gap-2">
                          <TenderIcon id={primaryId === "other" ? "cash" : primaryId} size={36} />
                          <span className="text-[13px] font-medium">{primary.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-[110px] w-[110px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={donut}
                                  dataKey="value"
                                  innerRadius={36}
                                  outerRadius={52}
                                  paddingAngle={2}
                                  strokeWidth={0}
                                  isAnimationActive={false}
                                >
                                  {donut.map((slice) => (
                                    <Cell key={slice.name} fill={slice.fill} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <p className="text-[28px] font-semibold leading-none tabular-nums">
                              {primaryShare.toFixed(1)}%
                            </p>
                            <p className="mt-1 min-w-0 text-pos-ink-faint">
                              <FitMoney minor={primary.total} kind="cell" className="font-normal" />
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex items-center justify-between gap-2 rounded-[18px] bg-pos-surface-elevated px-3 py-2.5 shadow-pos-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <TenderIcon id={secondId === "other" ? "card" : secondId} size={36} />
                            <span className="truncate">{second.name}</span>
                          </span>
                          <span className="shrink-0 text-right tabular-nums">
                            <span className="font-medium">{((second.total / tenderTotalAll) * 100).toFixed(1)}%</span>
                            <span className="ml-1 min-w-0 text-pos-ink-faint">
                              <FitMoney minor={second.total} kind="cell" className="inline font-normal" />
                            </span>
                          </span>
                        </div>
                        <div className="rounded-[18px] bg-pos-surface-elevated px-3 py-2.5 shadow-pos-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <TenderIcon id={thirdId === "other" ? "transfer" : thirdId} size={36} />
                              <span className="truncate">{third.name}</span>
                            </span>
                            <span className="shrink-0 text-right tabular-nums">
                              <span className="font-medium">{((third.total / tenderTotalAll) * 100).toFixed(1)}%</span>
                              <span className="ml-1 min-w-0 text-pos-ink-faint">
                                <FitMoney minor={third.total} kind="cell" className="inline font-normal" />
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-end gap-1 pr-0 text-right tabular-nums text-pos-ink-faint">
                            <span className="font-medium text-pos-ink">
                              {((thirdExtra.total / tenderTotalAll) * 100).toFixed(1)}%
                            </span>
                            <FitMoney minor={thirdExtra.total} kind="cell" className="inline font-normal" />
                          </div>
                        </div>
                        <p className="px-1 text-pos-ink-faint">
                          Other{" "}
                          <span className="font-medium text-pos-ink">{otherShare.toFixed(1)}%</span>{" "}
                          <span className="tabular-nums">
                            <FitMoney minor={otherTotal} kind="cell" className="inline font-normal" />
                          </span>
                        </p>
                      </div>
                    </div>
                    <SalesDynamicChart weeks={myWeeks} people={cashiers} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function sumBy<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = key(row) || "Other";
    map.set(id, (map.get(id) ?? 0) + amount(row));
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function buildMonths(rows: HqSale[], to: Date) {
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(to.getFullYear(), to.getMonth() - (2 - index), 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    const bucket = rows.filter((row) => inRange(row, start, end));
    const people = sumBy(bucket, (row) => row.cashierName || "Till", (row) => row.totalMinor);
    const peopleTickets = sumBy(bucket, (row) => row.cashierName || "Till", () => 1);
    const monthTotal = bucket.reduce((sum, row) => sum + row.totalMinor, 0);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      total: monthTotal,
      a: people[0]?.total ?? 0,
      b: people[1]?.total ?? 0,
      c: people[2]?.total ?? 0,
      ta: peopleTickets[0]?.total ?? 0,
      tb: peopleTickets[1]?.total ?? 0,
      tc: peopleTickets[2]?.total ?? 0,
      ma: monthTotal ? Math.round(((people[0]?.total ?? 0) / monthTotal) * 100) : 0,
      mb: monthTotal ? Math.round(((people[1]?.total ?? 0) / monthTotal) * 100) : 0,
      mc: monthTotal ? Math.round(((people[2]?.total ?? 0) / monthTotal) * 100) : 0,
      people: people.slice(0, 3),
    };
  });
}

export function HqDashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const [sales, setSales] = useState<HqSale[]>([]);
  const [accounts, setAccounts] = useState<Omit<ConsoleAccount, "password">[]>([]);
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);
  const [ready, setReady] = useState(false);
  const [days, setDays] = useState(90);
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<"revenue" | "tickets" | "mix">("revenue");
  const [selectedCashier, setSelectedCashier] = useState<string | null>(null);
  const [featuredTender, setFeaturedTender] = useState<string | null>(null);
  const [tenderSort, setTenderSort] = useState<"amount" | "name" | "share">("amount");

  useEffect(() => {
    let cancelled = false;
    async function load(first = false) {
      try {
        const [nextSales, nextAccounts, nextCatalog] = await Promise.all([
          listSales(),
          listAccounts(),
          listCatalog(),
        ]);
        if (cancelled) return;
        setSales(nextSales);
        setAccounts(nextAccounts);
        setCatalog(nextCatalog);
      } catch {
        /* keep last good snapshot */
      } finally {
        if (first && !cancelled) setReady(true);
      }
    }
    void load(true);
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const report = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - days * 24 * 60 * 60 * 1000);
    const current = sales.filter((row) => inRange(row, from, to));
    const previous = sales.filter((row) => inRange(row, prevFrom, prevTo));
    const revenue = current.reduce((sum, row) => sum + row.totalMinor, 0);
    const prevRevenue = previous.reduce((sum, row) => sum + row.totalMinor, 0);
    const delta = revenue - prevRevenue;
    const pct = prevRevenue ? (delta / prevRevenue) * 100 : current.length ? 100 : 0;
    const cashiers = sumBy(current, (row) => row.cashierName || "Till", (row) => row.totalMinor);
    const tenders = sumBy(current, (row) => row.tender || "Other", (row) => row.totalMinor);
    const ticketsByTender = sumBy(current, (row) => row.tender || "Other", () => 1);
    const ticketsByCashier = sumBy(current, (row) => row.cashierName || "Till", () => 1);
    const linesByCashier = sumBy(
      current,
      (row) => row.cashierName || "Till",
      (row) => row.lines?.length ?? 1,
    );
    const topCashier = ticketsByCashier[0];
    const best = current.reduce<HqSale | null>(
      (lead, row) => (!lead || row.totalMinor > lead.totalMinor ? row : lead),
      null,
    );
    const card = current.filter((row) => /card|pos|transfer/i.test(row.tender)).length;
    const weeks = Array.from({ length: 11 }, (_, index) => {
      const end = new Date(to.getTime() - (10 - index) * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const rows = current.filter((row) => inRange(row, start, end));
      return {
        week: `W${index + 1}`,
        value: rows.reduce((sum, row) => sum + row.totalMinor, 0),
        tickets: rows.length,
      };
    });
    const months = buildMonths(current, to);
    return {
      from,
      to,
      prevFrom,
      prevTo,
      current,
      revenue,
      prevRevenue,
      delta,
      pct,
      cashiers,
      tenders,
      ticketsByTender,
      tickets: current.length,
      prevTickets: previous.length,
      ticketsByCashier,
      linesByCashier,
      topCashier,
      best,
      cardMix: current.length ? Math.round((card / current.length) * 100) : 0,
      weeks,
      months,
      avgTicket: current.length ? revenue / current.length : 0,
    };
  }, [sales, days]);

  useEffect(() => {
    if (selectedCashier && report.cashiers.some((row) => row.name === selectedCashier)) return;
    if (report.cashiers[0]) setSelectedCashier(report.cashiers[0].name);
  }, [report.cashiers, selectedCashier]);

  useEffect(() => {
    if (!rangeOpen) return;
    function onPointer(event: MouseEvent) {
      if (!rangeRef.current?.contains(event.target as Node)) setRangeOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRangeOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [rangeOpen]);

  function downloadCsv() {
    const rows = [
      ["ticket", "paidAt", "cashier", "tender", "total"],
      ...report.current.map((row) => [
        row.ticketId,
        row.paidAt,
        row.cashierName,
        row.tender,
        String(row.totalMinor / 100),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hq-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported.");
  }

  async function shareReport() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "HQ report", url });
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
      toast.error("Could not copy the report link.");
    }
  }

  const featuredName = featuredTender ?? report.tenders[0]?.name ?? "Cash";
  const featured = report.tenders.find((row) => row.name === featuredName) ?? {
    name: featuredName,
    total: tenderTotal(report.tenders, asTenderId(featuredName)),
  };
  const featuredTickets = report.current.filter(
    (row) => (row.tender || "Other") === featured.name,
  ).length;
  const featuredMonths = buildMonths(
    report.current.filter((row) => (row.tender || "Other") === featured.name),
    report.to,
  );
  const featuredMix = featuredTickets
    ? Math.round(
        (report.current.filter(
          (row) =>
            (row.tender || "Other") === featured.name && /card|pos|transfer|wallet/i.test(row.tender),
        ).length /
          featuredTickets) *
          100,
      )
    : 0;
  const people = accounts.slice(0, 3);
  const extra = accounts[3];
  const cashierBar = fillCashierBar(report.cashiers, accounts);
  const positive = report.pct >= 0;
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
  const tenderRows = [...TENDERS]
    .map((row) => {
      const total = tenderTotal(report.tenders, row.id);
      return {
        ...row,
        total,
        share: report.revenue ? Math.round((total / report.revenue) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (tenderSort === "name") return a.name.localeCompare(b.name);
      if (tenderSort === "share") return b.share - a.share;
      return b.total - a.total;
    });

  if (!ready) return <DashboardSkeleton />;

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/setup/users/account"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-surface text-pos-ink shadow-pos-sm"
            aria-label="Add people"
          >
            <Plus size={18} strokeWidth={2} />
          </Link>
          {people.map((row, index) => (
            <Link
              key={row.id}
              href="/setup/users/account"
              className="flex items-center gap-2 rounded-full bg-pos-surface py-1 pl-1 pr-3 shadow-pos-sm"
            >
              <Avatar name={row.name} size={28} index={index} />
              <span className="text-[13px] font-medium text-pos-ink">{shortName(row.name)}</span>
            </Link>
          ))}
          <Link
            href="/setup/users/account"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pos-inverse text-[11px] font-semibold text-white"
            aria-label="All accounts"
          >
            {extra?.name.trim().charAt(0).toUpperCase() || "C"}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-pos-surface text-pos-ink shadow-pos-sm"
              aria-label="Copy link"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href).then(
                  () => toast.success("Link copied."),
                  () => toast.error("Could not copy the link."),
                );
              }}
            >
              <Link2 size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-pos-surface text-pos-ink shadow-pos-sm"
              aria-label="Export report"
              onClick={downloadCsv}
            >
              <Upload size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-pos-surface text-pos-ink shadow-pos-sm"
              aria-label="Share"
              onClick={() => void shareReport()}
            >
              <Share2 size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="min-w-0 max-w-[min(100%,22rem)] truncate text-[clamp(1.5rem,4vw,2.5rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            Welcome, {firstName(session?.name || "there")}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-pos-ink-faint">Timeframe</span>
            <button
              type="button"
              className={`relative h-6 w-11 rounded-full transition-colors ${
                days === 30 ? "bg-pos-inverse" : "bg-pos-border"
              }`}
              onClick={() => setDays((value) => (value === 30 ? 90 : 30))}
              aria-label="Toggle 30 or 90 days"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-pos-surface transition ${
                  days === 30 ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
            <div className="relative" ref={rangeRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-pos-surface px-4 py-2 text-sm text-pos-ink shadow-pos-sm"
                onClick={() => setRangeOpen((open) => !open)}
                aria-expanded={rangeOpen}
              >
                {rangeLabel(report.from, report.to)}
                <ChevronDown size={14} strokeWidth={2} className="text-pos-ink-faint" />
              </button>
              {rangeOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl bg-pos-surface py-1 shadow-pos-md">
                  {[
                    { days: 30, label: "Last 30 days" },
                    { days: 90, label: "Last 90 days" },
                    { days: 365, label: "Last 12 months" },
                  ].map((row) => (
                    <button
                      key={row.days}
                      type="button"
                      className={`block w-full px-4 py-2 text-left text-sm text-pos-ink ${
                        days === row.days ? "bg-pos-surface-muted font-medium" : "hover:bg-pos-surface-muted"
                      }`}
                      onClick={() => {
                        setDays(row.days);
                        setRangeOpen(false);
                      }}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="min-w-0 shrink-0 overflow-hidden lg:max-w-[340px]">
          <p className="text-[13px] text-pos-ink-faint">Revenue</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <FitMoney minor={report.revenue} kind="hero" />
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold text-white ${
                positive ? "bg-pos-success" : "bg-pos-primary"
              }`}
            >
              <DeltaIcon size={13} strokeWidth={2.6} />
              {Math.abs(report.pct).toFixed(1)}%
            </span>
            <span className="min-w-0 max-w-[9rem] truncate rounded-full bg-red-500/10 px-2.5 py-0.5 text-[12px] font-medium text-red-600 dark:text-red-400" title={naira(Math.abs(report.delta))}>
              {displayMoney(Math.abs(report.delta))}
            </span>
          </div>
          <p className="mt-2 min-w-0 truncate text-[13px] text-pos-ink-faint" title={`vs prev. ${naira(report.prevRevenue)}`}>
            vs prev. {displayMoney(report.prevRevenue)} {rangeLabel(report.prevFrom, report.prevTo)}
          </p>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1.35fr)]">
          <button
            type="button"
            className="flex min-h-[118px] flex-col rounded-[20px] bg-pos-surface p-3.5 text-left shadow-pos-sm"
            onClick={() => {
              if (report.topCashier) setSelectedCashier(report.topCashier.name);
              setFocus("tickets");
            }}
          >
            <p className="text-[13px] text-pos-ink-faint">Top cashier</p>
            <div className="mt-auto flex min-w-0 items-end justify-between gap-2">
              <p
                className={`min-w-0 truncate font-semibold leading-none tabular-nums ${moneyClass(String(report.topCashier?.total ?? 0), "card")}`}
              >
                {report.topCashier?.total ?? 0}
              </p>
              {report.topCashier ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={report.topCashier.name} size={24} index={2} />
                  <span className="text-[13px] font-medium">
                    {firstName(report.topCashier.name)}
                  </span>
                </div>
              ) : null}
            </div>
          </button>

          <Link
            href="/reports/sales/invoice/list"
            className="flex min-h-[118px] flex-col rounded-[20px] bg-pos-inverse p-3.5 text-white"
          >
            <p className="flex items-center justify-between text-[13px] text-white/50">
              Best ticket
              <Star size={15} fill="currentColor" />
            </p>
            <p className="mt-auto min-w-0">
              <FitMoney
                minor={report.best ? report.best.totalMinor : 0}
                kind="card"
                className="text-white"
              />
            </p>
            <p className="mt-1.5 truncate text-[13px] text-white/45">
              {report.best?.cashierName || "No tickets yet"}
            </p>
          </Link>

          <div className="col-span-2 grid min-h-[118px] grid-cols-3 rounded-[20px] bg-pos-surface p-2 shadow-pos-sm sm:col-span-1">
            {[
              {
                label: "Tickets",
                value: String(report.tickets),
                hint: `${report.tickets - report.prevTickets >= 0 ? "+" : ""}${report.tickets - report.prevTickets}`,
                key: "tickets" as const,
              },
              {
                label: "Value",
                value: compact(report.revenue),
                hint: `${report.pct >= 0 ? "+" : ""}${report.pct.toFixed(1)}%`,
                key: "revenue" as const,
              },
              {
                label: "Card mix",
                value: `${report.cardMix}%`,
                hint: `${report.cardMix >= 0 ? "+" : ""}${report.cardMix.toFixed(1)}%`,
                key: "mix" as const,
              },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                className={`flex flex-col justify-center rounded-[16px] px-2.5 py-2 text-left ${
                  focus === row.key ? "ring-2 ring-pos-primary" : ""
                }`}
                onClick={() => setFocus(row.key)}
              >
                <p className="text-[12px] text-pos-ink-faint">{row.label}</p>
                <p className="mt-1 min-w-0">
                  <span className={`block truncate font-semibold leading-none tabular-nums ${moneyClass(row.value, "tile")}`}>
                    {row.value}
                  </span>
                </p>
                <p
                  className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-pos-primary"
                >
                  <ArrowUpRight size={11} strokeWidth={2.6} />
                  {row.hint}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-12 w-full min-w-0 flex-nowrap items-center overflow-hidden rounded-full bg-pos-surface py-1 pl-2 pr-1 shadow-pos-sm">
        {cashierBar.length === 0 ? (
          <p className="flex-1 px-4 text-[13px] text-pos-ink-faint">
            No cashier split until tickets land.
          </p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-nowrap items-center">
            {cashierBar.map((row, index) => {
              const share = report.revenue ? (row.total / report.revenue) * 100 : 0;
              return (
                <button
                  key={row.name}
                  type="button"
                  className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden whitespace-nowrap px-2.5 text-left"
                  onClick={() => setSelectedCashier(row.name)}
                >
                  <Avatar name={row.name} size={20} index={index} />
                  <span className="min-w-0 truncate text-[13px] font-medium leading-none tabular-nums">
                    {displayMoney(row.total)}
                  </span>
                  <span className="ml-auto shrink-0 text-[12px] leading-none text-pos-ink-faint">
                    {share.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <Link
          href="/reports/sales/invoice/list"
          className="ml-1.5 shrink-0 rounded-full bg-pos-inverse px-4 py-2 text-[13px] font-medium leading-none text-white"
        >
          Details
        </Link>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex h-full min-h-[292px] flex-col rounded-[28px] bg-pos-surface p-5 shadow-pos-sm">
            <div className="mb-4 flex items-center justify-between">
              <PillMenu align="left" trigger={<MenuPill icon={Menu} />}>
                <MenuItem
                  label="Invoice list"
                  onClick={() => router.push("/reports/sales/invoice/list")}
                />
                <MenuItem
                  label="Invoice summary"
                  onClick={() => router.push("/reports/sales/invoice/summary")}
                />
              </PillMenu>
              <PillMenu trigger={<FilterPill />}>
                <MenuItem
                  label="By amount"
                  active={tenderSort === "amount"}
                  onClick={() => setTenderSort("amount")}
                />
                <MenuItem
                  label="By share"
                  active={tenderSort === "share"}
                  onClick={() => setTenderSort("share")}
                />
                <MenuItem
                  label="By name"
                  active={tenderSort === "name"}
                  onClick={() => setTenderSort("name")}
                />
              </PillMenu>
            </div>
            <ul>
              {tenderRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                    onClick={() => {
                      const live =
                        report.tenders.find((item) => tenderIdOf(item.name) === row.id)?.name ??
                        row.name;
                      setFeaturedTender(live);
                    }}
                  >
                    <TenderIcon id={row.id} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-pos-ink">
                      {row.name}
                    </span>
                    <span className="min-w-0 max-w-[7.5rem] text-right text-[15px] font-medium text-pos-ink">
                      <FitMoney minor={row.total} kind="cell" />
                    </span>
                    <span className="w-10 text-right text-[13px] text-pos-ink-faint">{row.share}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <ExpiredStockCard items={catalog} />

          <div className="overflow-hidden rounded-[28px] bg-pos-surface shadow-pos-sm sm:col-span-2">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
              <PillMenu
                align="left"
                trigger={
                  <button type="button" className="flex min-w-0 items-center gap-3 text-left">
                    <TenderIcon id={asTenderId(featured.name)} size={36} />
                    <div className="min-w-0">
                      <p className="text-[13px] text-pos-ink-faint">Tender value</p>
                      <p className="flex items-center gap-1 text-[16px] font-semibold text-pos-ink">
                        {featured.name}
                        <ChevronDown size={16} className="text-pos-ink-faint" />
                      </p>
                    </div>
                  </button>
                }
              >
                {(report.tenders.length ? report.tenders : TENDERS.map((row) => ({ name: row.name, total: 0 }))).map(
                  (row) => (
                    <MenuItem
                      key={row.name}
                      label={row.name}
                      active={featured.name === row.name}
                      onClick={() => setFeaturedTender(row.name)}
                    />
                  ),
                )}
              </PillMenu>
              <div className="flex shrink-0 items-center gap-1 text-[13px]">
                {(["revenue", "tickets", "mix"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-full px-3.5 py-1.5 ${
                      focus === key ? "bg-pos-inverse text-white" : "text-pos-ink-faint"
                    }`}
                    onClick={() => setFocus(key)}
                  >
                    {key === "tickets" ? "Tickets" : key === "mix" ? "Mix" : "Revenue"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-h-[260px] items-stretch">
              <div
                className="hidden w-[196px] shrink-0 rounded-tr-[32px] bg-pos-primary sm:flex"
              >
                <p
                  className="flex w-7 shrink-0 items-center justify-center text-[11px] font-medium tracking-[0.06em] text-white/70"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Average monthly
                </p>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-[18px] py-6 pr-5 text-white [font-feature-settings:'tnum']">
                  <div className="min-w-0">
                    <p className="text-[13px] font-normal leading-none text-white/70">Revenue</p>
                    <div className="mt-[7px] min-w-0 text-white">
                      <FitMoney minor={featured.total} kind="rail" className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-normal leading-none text-white/70">Tickets</p>
                    <p className="mt-[7px] text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                      {featuredTickets}
                      <span className="ml-1.5 text-[13px] font-medium tracking-normal text-white/55">
                        {featuredTickets}/{Math.max(report.tickets - featuredTickets, 0)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] font-normal leading-none text-white/70">Mix</p>
                    <p className="mt-[7px] text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                      {featuredMix}%
                      <span className="ml-1.5 text-[13px] font-medium tracking-normal text-white/55">
                        {Math.round((featuredMix / 100) * featuredTickets)}/{featuredTickets}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <PlatformMonthChart
                months={featuredMonths.some((row) => row.total) ? featuredMonths : report.months}
                people={accounts}
                focus={focus}
              />
            </div>
          </div>
        </div>

        <SalesTeamCard
          cashiers={report.cashiers}
          ticketsByCashier={report.ticketsByCashier}
          linesByCashier={report.linesByCashier}
          sales={report.current}
          weeks={report.weeks}
          revenue={report.revenue}
          selected={selectedCashier}
          onSelect={setSelectedCashier}
        />
      </div>
    </div>
  );
}
