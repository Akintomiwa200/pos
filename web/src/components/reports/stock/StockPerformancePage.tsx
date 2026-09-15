"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, PackageX, Shell, Timer } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listStockLevels, naira, type StockLevel } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StockPerformancePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listStockLevels(), listSales()])
      .then(([lv, s]) => {
        setLevels(lv);
        setSales(s);
      })
      .catch(() => {
        setLevels([]);
        setSales([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!levels || !sales) return null;
    const sold = new Map<string, { units: number; revenueMinor: number }>();
    for (const sale of sales) {
      for (const line of sale.lines ?? []) {
        const key = line.itemId ?? line.name;
        const row = sold.get(key) ?? { units: 0, revenueMinor: 0 };
        row.units += line.quantity;
        row.revenueMinor += line.quantity * line.unitPriceMinor;
        sold.set(key, row);
      }
    }
    const items = levels.map((row) => {
      const perf = sold.get(row.itemId) ?? { units: 0, revenueMinor: 0 };
      return { ...row, unitsSold: perf.units, revenueMinor: perf.revenueMinor };
    });
    const soldItems = items.filter((row) => row.unitsSold > 0).sort((a, b) => b.revenueMinor - a.revenueMinor);
    const hot = soldItems.slice(0, 8);
    const median = soldItems.length ? soldItems[Math.floor(soldItems.length / 2)]!.revenueMinor : 0;
    const slow = soldItems.filter((row) => row.revenueMinor <= median && !hot.includes(row)).slice(0, 10);
    const dead = items
      .filter((row) => row.onHand > 0 && row.unitsSold === 0)
      .sort((a, b) => b.onHand - a.onHand)
      .slice(0, 10);
    const totalRevenue = soldItems.reduce((sum, row) => sum + row.revenueMinor, 0);
    const deadValue = dead.reduce((sum, row) => sum + row.valueMinor, 0);
    return { hot, slow, dead, totalRevenue, deadValue };
  }, [levels, sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const label = (row: { name: string; unitsSold: number; revenueMinor: number }) =>
    `${row.unitsSold.toLocaleString()} units · ${naira(row.revenueMinor)}`;

  const listBlock = (
    rows: Array<{ name: string; unitsSold: number; revenueMinor: number }>,
    empty: string,
  ) =>
    rows.length === 0 ? (
      <p className="py-8 text-center text-sm text-pos-ink-faint">{empty}</p>
    ) : (
      <ol className="divide-y divide-pos-border/60">
        {rows.map((row, index) => (
          <li key={row.name} className="flex items-center gap-3 py-3">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                index === 0 ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-pos-ink">{row.name}</span>
              <span className="text-[11px] text-pos-ink-faint">{label(row)}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.revenueMinor)}</span>
          </li>
        ))}
      </ol>
    );

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Inventory · Performance</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Inventory performance</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Top movers, slow movers and dead stock — sales velocity against what is sitting on the shelf.
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
              <Flame size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">Top movers</h2>
              <p className="text-xs text-pos-ink-faint">{naira(rows.totalRevenue)} sold across items</p>
            </div>
          </header>
          {listBlock(rows.hot, "No sales recorded yet.")}
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Timer size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">Slow movers</h2>
              <p className="text-xs text-pos-ink-faint">Below median sales contribution</p>
            </div>
          </header>
          {listBlock(rows.slow, "No slow movers below the line yet.")}
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-pos-danger/10 text-pos-danger">
              <PackageX size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">Dead stock</h2>
              <p className="text-xs text-pos-ink-faint">{naira(rows.deadValue)} tied up</p>
            </div>
          </header>
          <ol className="divide-y divide-pos-border/60">
            {rows.dead.length === 0 ? (
              <p className="py-8 text-center text-sm text-pos-ink-faint">No unsold stock on the shelf.</p>
            ) : (
              rows.dead.map((row, index) => (
                <li key={row.itemId} className="flex items-center gap-3 py-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-[11px] font-bold text-pos-ink-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-pos-ink">{row.name}</span>
                    <span className="text-[11px] text-pos-ink-faint">{row.onHand.toLocaleString()} units on hand</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.valueMinor)}</span>
                </li>
              ))
            )}
          </ol>
        </article>
      </div>
    </div>
  );
}