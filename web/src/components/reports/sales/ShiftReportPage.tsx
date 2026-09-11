"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, LineChart as LineChartIcon, ReceiptText, UserRound } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { aggregateSales, dayKey, hourOf, naira, prettyDay } from "@/lib/hq-ops";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

type CashierRow = {
  name: string;
  tickets: number;
  revenueMinor: number;
  days: number;
  firstAt: string;
  lastAt: string;
  perDayMinor: number;
  hours: Array<{ label: string; value: number }>;
};

function initial(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function CashierCard({ row, index }: { row: CashierRow; index: number }) {
  const colors = useThemeColors();
  return (
    <article className="overflow-hidden rounded-[22px] bg-pos-surface shadow-pos-md">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold ${
            index === 0
              ? "bg-pos-primary text-white"
              : index === 1
                ? "bg-pos-surface-muted text-pos-ink-muted"
                : "bg-pos-primary-soft text-pos-primary"
          }`}
        >
          {initial(row.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-pos-ink">{row.name}</p>
          <p className="mt-0.5 text-xs text-pos-ink-faint">
            First shift {prettyDay(dayKey(row.firstAt))} · Last {prettyDay(dayKey(row.lastAt))}
          </p>
        </div>
        {index === 0 ? (
          <span className="rounded-full bg-pos-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-pos-primary">
            Top
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px bg-pos-border/40 px-5 text-center">
        <div className="bg-pos-surface py-3">
          <p className="text-lg font-bold tabular-nums text-pos-ink">{naira(row.revenueMinor)}</p>
          <p className="text-[11px] text-pos-ink-faint">Revenue</p>
        </div>
        <div className="bg-pos-surface py-3">
          <p className="text-lg font-bold tabular-nums text-pos-ink">{row.tickets}</p>
          <p className="text-[11px] text-pos-ink-faint">Tickets</p>
        </div>
        <div className="bg-pos-surface py-3">
          <p className="text-lg font-bold tabular-nums text-pos-ink">{naira(row.perDayMinor)}</p>
          <p className="text-[11px] text-pos-ink-faint">Per day</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 border-t border-pos-border/60 px-5 py-3 text-xs text-pos-ink-faint">
        <span className="inline-flex items-center gap-1">
          <CalendarClock size={13} /> {row.days} day{row.days === 1 ? "" : "s"} worked
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <LineChartIcon size={13} /> {timeOf(row.firstAt)} → {timeOf(row.lastAt)}
        </span>
      </div>

      <div className="h-16 px-2">
        {row.hours.length === 0 ? (
          <div className="grid h-full place-items-center text-[11px] text-pos-ink-faint">No hourly data.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={row.hours} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`shift${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                formatter={(value) => [naira(Number(value)), "Revenue"]}
                contentStyle={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  color: colors.ink,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.primary}
                strokeWidth={1.75}
                fill={`url(#shift${index})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}

export function ShiftReportPage() {
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const aggregate = useMemo(() => (sales ? aggregateSales(sales) : null), [sales]);

  const cashiers = useMemo(() => {
    if (!sales) return [];
    const map = new Map<string, HqSale[]>();
    for (const sale of sales) {
      const name = sale.cashierName || "Unknown";
      const rows = map.get(name) ?? [];
      rows.push(sale);
      map.set(name, rows);
    }
    return [...map.entries()]
      .map(([name, rows]): CashierRow => {
        const revenue = rows.reduce((sum, sale) => sum + sale.totalMinor, 0);
        const sorted = [...rows].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
        const firstAt = sorted[0]!.paidAt;
        const lastAt = sorted[sorted.length - 1]!.paidAt;
        const days = new Set(rows.map((sale) => dayKey(sale.paidAt))).size;
        const hourMap = new Map<number, number>();
        for (const sale of rows) {
          hourMap.set(hourOf(sale.paidAt), (hourMap.get(hourOf(sale.paidAt)) ?? 0) + sale.totalMinor);
        }
        const hours = [...hourMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([hour, value]) => ({ label: `${hour}h`, value }))
          .slice(0, 10);
        return {
          name,
          tickets: rows.length,
          revenueMinor: revenue,
          days,
          firstAt,
          lastAt,
          perDayMinor: Math.round(revenue / Math.max(1, days)),
          hours,
        };
      })
      .sort((a, b) => b.revenueMinor - a.revenueMinor);
  }, [sales]);

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Sales · Invoice
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Shift report</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Per-cashier, per-day performance — who sold what, when, and how consistently.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
            <UserRound size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Cashiers seen</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">
              {new Set(cashiers.map((row) => row.name)).size}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
            <ReceiptText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Days covered</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">
              {new Set(sales.map((sale) => dayKey(sale.paidAt))).size}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
            <CalendarClock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Revenue covered</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">
              {naira(aggregate.revenueMinor)}
            </p>
          </div>
        </div>
      </div>

      {cashiers.length === 0 ? (
        <div className="grid gap-4 rounded-[22px] bg-pos-surface py-16 text-center shadow-pos-md sm:grid-cols-1">
          <div>
            <UserRound size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
            <p className="text-sm text-pos-ink-faint">No shifts have been recorded yet.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cashiers.map((row, index) => (
            <CashierCard key={row.name} row={row} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}