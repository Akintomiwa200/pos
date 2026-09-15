"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Store, TrendingUp, Wallet2 } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StoreSalesTrendPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales()
      .then(setSales)
      .catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const dayOf = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const stores = new Map<string, Map<string, number>>();
    const days = new Set<string>();
    for (const sale of sales) {
      const store = (sale.storeName || "Unassigned").trim();
      const day = dayOf(sale.paidAt);
      days.add(day);
      const dayMap = stores.get(store) ?? new Map<string, number>();
      dayMap.set(day, (dayMap.get(day) ?? 0) + sale.totalMinor);
      stores.set(store, dayMap);
    }
    const sortedDays = [...days].sort();
    const lines = [...stores.entries()].map(([store, dayMap]) => ({
      store,
      days: sortedDays.map((day) => dayMap.get(day) ?? 0),
    }));
    const totals = sortedDays.map((_, index) => lines.reduce((sum, row) => sum + row.days[index], 0));
    const total = totals.reduce((sum, value) => sum + value, 0);
    return { lines, days: sortedDays, totals, total };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Sales trend</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Store sales trend</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            A day-by-day heat of every outlet — spot the store that went quiet on Thursday and the one carrying the
            weekend.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stores</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">in the trend</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CalendarDays size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Days shown</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.days.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">from {rows.days[0] ?? "—"} to {rows.days.at(-1) ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TrendingUp size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Daily average</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.days.length ? naira(Math.round(rows.total / rows.days.length)) : naira(0)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">combined across outlets</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Day-by-day matrix</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Cell intensity scales with that store&apos;s busiest day.</p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No trend to draw until receipts carry a store tag.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="sticky left-0 bg-pos-surface-muted px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                      Store
                    </th>
                    {rows.days.map((day) => (
                      <th key={day} className="px-2 py-2.5 text-right text-[11px] font-semibold tabular-nums text-pos-ink-faint">
                        {day.slice(5)}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.store}>
                      <td className="sticky left-0 bg-pos-surface px-3 py-2 text-[13px] font-medium text-pos-ink">{row.store}</td>
                      {row.days.map((value, index) => {
                        const max = Math.max(...row.days, 1);
                        const alpha = value > 0 ? Math.max(0.18, value / max) : 0.05;
                        return (
                          <td key={index} className="px-2 py-2 text-right">
                            <span
                              className="inline-block min-w-[60px] rounded-md px-1.5 py-1 text-[12px] font-semibold tabular-nums"
                              style={{ background: `rgba(${value > 0 ? "74,144,226" : "148,163,184"})`, opacity: value > 0 ? alpha : undefined, color: value > 0 ? "#fff" : "rgba(148,163,184,0.6)" }}
                            >
                              {value > 0 ? naira(value).replace(/\.00$/, "") : "·"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                        {naira(row.days.reduce((sum, value) => sum + value, 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}