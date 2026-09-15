"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, PieChart, Store, TrendingUp } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function SalesByOutletPage() {
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
    const byStore = new Map<string, { tickets: number; spendMinor: number; lastAt: string }>();
    for (const sale of sales) {
      const key = (sale.storeName || "Unassigned").trim();
      const row = byStore.get(key) ?? { tickets: 0, spendMinor: 0, lastAt: sale.paidAt };
      row.tickets += 1;
      row.spendMinor += sale.totalMinor;
      if (sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      byStore.set(key, row);
    }
    const lines = [...byStore.entries()]
      .map(([store, row]) => ({ store, ...row }))
      .sort((a, b) => b.spendMinor - a.spendMinor);
    const total = lines.reduce((sum, row) => sum + row.spendMinor, 0);
    const best = lines[0];
    return { lines, total, best };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const max = Math.max(...rows.lines.map((row) => row.spendMinor), 1);

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Sales by outlet</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sales by outlet</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Where the money actually came from — every outlet-flagged receipt counted, with share-of-total next to each
            bar.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Outlets reporting</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">stores on receipts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BarChart3 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Leading outlet</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">{rows.best?.store ?? "—"}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.best ? naira(rows.best.spendMinor) : ""} collected</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TrendingUp size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total tagged</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">sales attributable to an outlet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Distribution</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Bars scale with the highest-performing outlet; unassigned receipts are listed for the record.</p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No sales attributed to an outlet yet.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.lines.map((row) => (
              <div key={row.store} className="flex items-center gap-4">
                <div className="w-44 shrink-0 truncate text-[13px] font-medium text-pos-ink">{row.store}</div>
                <div className="h-8 flex-1 overflow-hidden rounded-lg bg-pos-surface-muted">
                  <div
                    className="flex h-full items-center rounded-lg px-2 text-[11px] font-bold text-white"
                    style={{ width: `${Math.max(4, Math.round((row.spendMinor / max) * 100))}%`, background: colors.primary }}
                  >
                    <span className="truncate">{naira(row.spendMinor)}</span>
                  </div>
                </div>
                <div className="w-20 shrink-0 text-right text-[13px] tabular-nums text-pos-ink-muted">
                  {rows.total > 0 ? `${Math.round((row.spendMinor / rows.total) * 100)}%` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}