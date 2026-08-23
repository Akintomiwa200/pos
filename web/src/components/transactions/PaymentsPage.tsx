"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CreditCard,
  RotateCcw,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "@/lib/toast";
import {
  listDocs,
  listExpenses,
  naira,
  paymentFeed,
  prettyDay,
  type HqExpense,
  type PaymentFeed,
  type TradeDoc,
} from "@/lib/hq-ops";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../Skeleton";

type TxTab = "all" | "spend" | "refund" | "repayment";
type SummaryKey = "approved" | "income" | "refunded" | "customers";

type FeedRow = PaymentFeed["transactions"][number];

type UnifiedTx = {
  id: string;
  title: string;
  subtitle: string;
  at: string;
  amountMinor: number;
  kind: "income" | "spend" | "refund" | "repayment";
  tender?: string;
};

const TABS: { id: TxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "spend", label: "Spend" },
  { id: "refund", label: "Refund" },
  { id: "repayment", label: "Repayment" },
];

function tenderTone(tender: string, colors: { primary: string; success: string; warning: string; danger: string }) {
  const key = tender.toLowerCase();
  if (key.includes("cash")) return colors.success;
  if (key.includes("card") || key.includes("pos")) return colors.primary;
  if (key.includes("transfer") || key.includes("bank")) return "#38bdf8";
  if (key.includes("refund")) return colors.danger;
  return colors.warning;
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TX";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function PaymentsPage() {
  const colors = useThemeColors();
  const [feed, setFeed] = useState<PaymentFeed | null>(null);
  const [expenses, setExpenses] = useState<HqExpense[]>([]);
  const [refunds, setRefunds] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);
  const [summaryFocus, setSummaryFocus] = useState<SummaryKey>("approved");
  const [tab, setTab] = useState<TxTab>("all");
  const [range, setRange] = useState<"month" | "week">("month");
  const [statFilter, setStatFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      paymentFeed(),
      listExpenses().catch(() => [] as HqExpense[]),
      listDocs("sales-return").catch(() => [] as TradeDoc[]),
    ])
      .then(([payments, expenseRows, returnRows]) => {
        setFeed(payments);
        setExpenses(expenseRows);
        setRefunds(returnRows);
      })
      .catch((err) => {
        toast.error(err, "Could not load transactions");
        setFeed({ transactions: [], settlements: [] });
      })
      .finally(() => setReady(true));
  }, []);

  const incomeMinor = useMemo(
    () => (feed?.transactions ?? []).reduce((sum, row) => sum + row.totalMinor, 0),
    [feed],
  );
  const spendMinor = useMemo(
    () => expenses.reduce((sum, row) => sum + row.amountMinor, 0),
    [expenses],
  );
  const refundMinor = useMemo(
    () => refunds.reduce((sum, row) => sum + row.totalMinor, 0),
    [refunds],
  );
  const cashiers = useMemo(() => {
    const names = new Set((feed?.transactions ?? []).map((row) => row.cashierName).filter(Boolean));
    return names.size;
  }, [feed]);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = lastMonth.toISOString().slice(0, 7);

  function monthTotal(rows: Array<{ at?: string; paidAt?: string; amount?: number; total?: number }>, key: string) {
    return rows
      .filter((row) => (row.at ?? row.paidAt ?? "").startsWith(key))
      .reduce((sum, row) => sum + (row.amount ?? row.total ?? 0), 0);
  }

  const incomeThis = monthTotal(
    (feed?.transactions ?? []).map((row) => ({
      paidAt: row.paidAt,
      total: row.totalMinor,
    })),
    thisMonthKey,
  );
  const incomeLast = monthTotal(
    (feed?.transactions ?? []).map((row) => ({
      paidAt: row.paidAt,
      total: row.totalMinor,
    })),
    lastMonthKey,
  );
  const incomeDelta = pctChange(incomeThis, incomeLast);

  const spendAnalysis = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const row of expenses) {
      const key = row.account || "Other";
      buckets.set(key, (buckets.get(key) ?? 0) + row.amountMinor);
    }
    if (!buckets.size && feed?.settlements.length) {
      for (const row of feed.settlements) {
        buckets.set(row.tender, row.totalMinor);
      }
    }
    const total = [...buckets.values()].reduce((sum, value) => sum + value, 0) || 1;
    const palette = [colors.success, colors.danger, colors.warning, colors.primary, "#38bdf8"];
    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        value,
        pct: Math.round((value / total) * 100),
        color: palette[index % palette.length]!,
      }));
  }, [expenses, feed, colors]);

  const spendTotal = spendAnalysis.reduce((sum, row) => sum + row.value, 0);

  const statisticSeries = useMemo(() => {
    const source =
      statFilter === "spend"
        ? expenses.map((row) => ({ at: row.at, amount: row.amountMinor }))
        : (feed?.transactions ?? []).map((row) => ({ at: row.paidAt, amount: row.totalMinor }));
    const days = range === "week" ? 7 : 30;
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of source) {
      const key = row.at.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + row.amount);
    }
    const values = [...map.values()];
    const peak = Math.max(...values, 1);
    return [...map.entries()].map(([day, amount]) => ({
      day: day.slice(8),
      label: prettyDay(day).split(" ")[0] ?? day.slice(8),
      amount,
      pct: Math.round((amount / peak) * 100),
    }));
  }, [feed, expenses, range, statFilter]);

  const unified = useMemo(() => {
    const incomeRows: UnifiedTx[] = (feed?.transactions ?? []).map((row: FeedRow) => ({
      id: `pay-${row.ticketId}-${row.paidAt}`,
      title: `Ticket ${row.ticketId}`,
      subtitle: `${prettyDay(row.paidAt.slice(0, 10))} · ${row.cashierName}`,
      at: row.paidAt,
      amountMinor: row.totalMinor,
      kind: "income" as const,
      tender: row.tender,
    }));
    const spendRows: UnifiedTx[] = expenses.map((row) => ({
      id: `exp-${row.id}`,
      title: row.description || row.account,
      subtitle: `${prettyDay(row.at.slice(0, 10))} · ${row.account}`,
      at: row.at,
      amountMinor: row.amountMinor,
      kind: "spend" as const,
      tender: row.method,
    }));
    const refundRows: UnifiedTx[] = refunds.map((row) => ({
      id: `ref-${row.id}`,
      title: row.number || "Sales return",
      subtitle: `${prettyDay(row.at.slice(0, 10))} · ${row.party || "Customer"}`,
      at: row.at,
      amountMinor: row.totalMinor,
      kind: "refund" as const,
    }));
    return [...incomeRows, ...spendRows, ...refundRows].sort((a, b) =>
      b.at.localeCompare(a.at),
    );
  }, [feed, expenses, refunds]);

  const listRows = useMemo(() => {
    if (tab === "all") return unified;
    if (tab === "spend") return unified.filter((row) => row.kind === "spend");
    if (tab === "refund") return unified.filter((row) => row.kind === "refund");
    return unified.filter((row) => row.kind === "repayment");
  }, [unified, tab]);

  if (!ready || !feed) return <ManagerSkeleton variant="table" />;

  const summaries: Array<{
    key: SummaryKey;
    label: string;
    value: string;
    delta: number;
    icon: LucideIcon;
    accent: string;
    soft: string;
  }> = [
    {
      key: "approved",
      label: "Approved",
      value: naira(incomeMinor),
      delta: incomeDelta,
      icon: BadgeCheck,
      accent: colors.success,
      soft: "bg-pos-success-soft text-pos-success",
    },
    {
      key: "income",
      label: "Total Income",
      value: naira(incomeMinor),
      delta: incomeDelta,
      icon: Banknote,
      accent: colors.warning,
      soft: "bg-amber-50 text-amber-700",
    },
    {
      key: "refunded",
      label: "Refunded",
      value: naira(refundMinor),
      delta: refunds.length ? 3.65 : 0,
      icon: RotateCcw,
      accent: colors.danger,
      soft: "bg-red-50 text-red-600",
    },
    {
      key: "customers",
      label: "Cashiers active",
      value: cashiers.toLocaleString(),
      delta: cashiers ? 3.65 : 0,
      icon: UserRound,
      accent: colors.primary,
      soft: "bg-pos-primary-soft text-pos-primary",
    },
  ];

  const monthLabel = new Date().toLocaleDateString("en-NG", { month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[clamp(1.75rem,3.5vw,2.35rem)] font-medium leading-none tracking-tight text-pos-ink">
          Transaction
        </h1>
        <p className="mt-2 text-sm text-pos-ink-muted">
          Payments, spend, and refunds across tills — live from HQ.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaries.map((card) => {
          const active = summaryFocus === card.key;
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setSummaryFocus(card.key)}
              className={`rounded-[24px] p-4 text-left shadow-pos-sm transition ${
                active
                  ? "bg-pos-inverse text-white shadow-pos-md"
                  : "bg-pos-surface text-pos-ink hover:bg-pos-surface-muted"
              }`}
            >
              <div
                className={`grid h-11 w-11 place-items-center rounded-full ${
                  active ? "bg-white/10 text-white" : card.soft
                }`}
              >
                <Icon size={20} strokeWidth={2} />
              </div>
              <p className={`mt-4 text-sm ${active ? "text-white/65" : "text-pos-ink-muted"}`}>
                {card.label}
              </p>
              <p className="mt-1 truncate text-[22px] font-semibold tracking-tight tabular-nums">
                {card.value}
              </p>
              <p
                className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                  active ? "text-emerald-300" : "text-pos-success"
                }`}
              >
                <ArrowUpRight size={12} />
                {card.delta >= 0 ? "+" : ""}
                {card.delta}% {card.delta >= 0 ? "Increase" : "Decrease"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <div className="space-y-5">
          <section className="rounded-[28px] bg-pos-surface p-5 shadow-pos-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-pos-ink">Spent Analysis</h2>
              <select
                className="rounded-full border-0 bg-pos-surface-muted px-3 py-1.5 text-xs font-medium text-pos-ink outline-none"
                value={range}
                onChange={(event) => setRange(event.target.value as "month" | "week")}
              >
                <option value="month">This Month</option>
                <option value="week">This Week</option>
              </select>
            </div>
            <div className="relative mx-auto h-[220px] w-full max-w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendAnalysis.length ? spendAnalysis : [{ name: "None", value: 1, color: colors.border }]}
                    dataKey="value"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(spendAnalysis.length ? spendAnalysis : [{ color: colors.border }]).map((slice, index) => (
                      <Cell key={index} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => naira(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.ink,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-xl font-semibold tabular-nums text-pos-ink">
                    {naira(spendTotal || incomeMinor)}
                  </p>
                  <p className="mt-1 text-[11px] text-pos-ink-faint">
                    {expenses.length ? `Spent · ${monthLabel}` : `Collected · ${monthLabel}`}
                  </p>
                </div>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {spendAnalysis.map((slice) => (
                <li key={slice.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-pos-ink-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: slice.color }}
                    />
                    {slice.name}
                  </span>
                  <span className="font-medium tabular-nums text-pos-ink">{slice.pct}%</span>
                </li>
              ))}
              {!spendAnalysis.length ? (
                <li className="text-sm text-pos-ink-faint">No spend categories yet — showing tenders when empty.</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-[28px] bg-pos-surface p-5 shadow-pos-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-pos-ink">Statistic</h2>
              <select
                className="rounded-full border-0 bg-pos-surface-muted px-3 py-1.5 text-xs font-medium text-pos-ink outline-none"
                value={statFilter}
                onChange={(event) => setStatFilter(event.target.value)}
              >
                <option value="all">Income</option>
                <option value="spend">Spend</option>
              </select>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statisticSeries}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: colors.inkFaint, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    dataKey="pct"
                    tick={{ fill: colors.inkFaint, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      naira(Number(item?.payload?.amount ?? 0)),
                      "Amount",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.ink,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke={colors.primary}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: colors.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] bg-pos-surface p-5 shadow-pos-md">
          <h2 className="text-lg font-semibold text-pos-ink">Transactions</h2>
          <div className="mt-4 flex gap-6 border-b border-pos-border/70">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative pb-3 text-sm font-medium transition ${
                  tab === item.id ? "text-pos-primary" : "text-pos-ink-faint hover:text-pos-ink-muted"
                }`}
              >
                {item.label}
                {tab === item.id ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pos-primary" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-2 max-h-[640px] overflow-y-auto">
            {listRows.length === 0 ? (
              <p className="px-1 py-10 text-center text-sm text-pos-ink-faint">
                No {tab === "all" ? "" : `${tab} `}transactions yet.
              </p>
            ) : (
              <ul className="divide-y divide-pos-border/50">
                {listRows.slice(0, 40).map((row) => {
                  const negative = row.kind === "spend" || row.kind === "refund";
                  const color = tenderTone(row.tender || row.kind, {
                    primary: colors.primary,
                    success: colors.success,
                    warning: colors.warning,
                    danger: colors.danger,
                  });
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 py-3.5 first:pt-3"
                    >
                      <div
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white"
                        style={{ background: color }}
                      >
                        {row.kind === "income" ? (
                          <CreditCard size={18} />
                        ) : (
                          initials(row.title)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-pos-ink">{row.title}</p>
                        <p className="truncate text-[12px] text-pos-ink-faint">{row.subtitle}</p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          negative ? "text-pos-ink" : "text-pos-success"
                        }`}
                      >
                        {negative ? "−" : "+"}
                        {naira(row.amountMinor)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
