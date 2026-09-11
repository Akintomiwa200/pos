"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { CalendarDays, ReceiptText, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { aggregateSales, naira, prettyDay } from "@/lib/hq-ops";
import { compactMinor, useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const PIE_COLORS = ["primary", "chartSlice2", "chartSlice3", "chartSlice4"] as const;

function timeLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof ReceiptText;
  iconClass: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] ${iconClass}`}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">{label}</p>
        <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight text-pos-ink">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-pos-ink-faint">{hint}</p> : null}
      </div>
    </div>
  );
}

export function SalesAnalyticsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const aggregate = useMemo(() => (sales ? aggregateSales(sales) : null), [sales]);

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  const busiest = aggregate.byDay.length
    ? [...aggregate.byDay].sort((a, b) => b.totalMinor - a.totalMinor)[0]!
    : null;

  const trend = aggregate.byDay.map((row) => ({
    label: prettyDay(row.day).replace(",", ""),
    full: prettyDay(row.day),
    revenue: row.totalMinor,
    tickets: row.tickets,
  }));

  const palette = PIE_COLORS.map((key) =>
    key === "primary" ? colors.primary : colors[key as "chartSlice2"],
  );

  const hourData = aggregate.byHour.map((row) => ({ label: timeLabel(row.hour), value: row.totalMinor }));

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-72 w-72 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            Report · Sales · Analytics
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sales analytics</h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                Revenue, ticket flow, and what is actually selling — live across every till.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              <CalendarDays size={15} />
              {busiest
                ? `Busiest: ${prettyDay(busiest.day)} · ${naira(busiest.totalMinor)}`
                : "No sales yet"}
            </div>
          </div>

          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Revenue"
              value={naira(aggregate.revenueMinor)}
              hint={`${aggregate.tickets} tickets rung`}
              icon={Wallet}
              iconClass="bg-white/15 text-white"
            />
            <Metric
              label="Average ticket"
              value={naira(aggregate.avgTicketMinor)}
              hint="Per completed sale"
              icon={ReceiptText}
              iconClass="bg-white/15 text-white"
            />
            <Metric
              label="Units sold"
              value={aggregate.units.toLocaleString()}
              hint="Item quantity across lines"
              icon={ShoppingBag}
              iconClass="bg-white/15 text-white"
            />
            <Metric
              label="Days with sales"
              value={String(aggregate.byDay.length)}
              hint={`${aggregate.byTender.length} payment methods seen`}
              icon={TrendingUp}
              iconClass="bg-white/15 text-white"
            />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold text-pos-ink">Revenue trend</h2>
              <p className="mt-0.5 text-sm text-pos-ink-muted">Daily gross sales</p>
            </div>
            <p className="text-sm text-pos-ink-faint">
              Peak <span className="font-semibold text-pos-primary">{naira(busiest?.totalMinor ?? 0)}</span>
            </p>
          </header>
          <div className="h-[290px]">
            {trend.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-pos-ink-faint">No sales recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.chartGrid} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    stroke={colors.inkFaint}
                    fontSize={11}
                    tickFormatter={(v: number) => compactMinor(v)}
                  />
                  <Tooltip
                    formatter={(value) => [naira(Number(value)), "Revenue"]}
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      color: colors.ink,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={colors.primary}
                    strokeWidth={2.5}
                    fill="url(#revenueGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="flex flex-col rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Tender mix</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">How customers paid</p>
          </header>
          <div className="min-h-0 flex-1">
            {aggregate.byTender.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-pos-ink-faint">No payments yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value) => [naira(Number(value)), "Revenue"]}
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      color: colors.ink,
                    }}
                  />
                  <Pie
                    data={aggregate.byTender.map((row) => ({ label: row.tender, value: row.totalMinor }))}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="78%"
                    paddingAngle={2}
                  >
                    {aggregate.byTender.map((row) => (
                      <Cell
                        key={row.tender}
                        fill={palette[aggregate.byTender.indexOf(row) % palette.length]}
                        stroke={colors.surface}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="space-y-2 border-t border-pos-border/60 pt-4">
            {aggregate.byTender.slice(0, 4).map((row, index) => (
              <li key={row.tender} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-pos-ink-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: palette[index % palette.length] }}
                  />
                  <span className="capitalize">{row.tender}</span>
                </span>
                <span className="font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Busiest hours</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Revenue by hour of day</p>
          </header>
          <div className="mt-4 h-[220px]">
            {hourData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-pos-ink-faint">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={colors.chartGrid} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={10} interval={1} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [naira(Number(value)), "Revenue"]}
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      color: colors.ink,
                    }}
                  />
                  <Bar dataKey="value" fill={colors.chartBarAccent} radius={[6, 6, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Top categories</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Revenue by catalog category</p>
          </header>
          <ul className="mt-4 space-y-3">
            {aggregate.byCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No sales yet.</p>
            ) : (
              aggregate.byCategory.slice(0, 6).map((row) => {
                const max = aggregate.byCategory[0]!.totalMinor || 1;
                const share = Math.round((row.totalMinor / max) * 100);
                return (
                  <li key={row.category}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-pos-ink">{row.category}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-pos-ink">
                        {naira(row.totalMinor)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
                      <div className="h-full rounded-full bg-pos-primary" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Best sellers</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Top items by revenue</p>
          </header>
          <ol className="mt-4 divide-y divide-pos-border/60">
            {aggregate.byItem.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No sales yet.</p>
            ) : (
              aggregate.byItem.slice(0, 6).map((row, index) => (
                <li key={row.itemId || row.name} className="flex items-center gap-3 py-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      index === 0 ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-pos-ink">{row.name}</span>
                    <span className="text-[11px] text-pos-ink-faint">{row.units} sold</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-pos-ink">
                    {naira(row.totalMinor)}
                  </span>
                </li>
              ))
            )}
          </ol>
        </article>
      </section>
    </div>
  );
}