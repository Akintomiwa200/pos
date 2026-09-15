"use client";

import { useEffect, useMemo, useState } from "react";
import { GitCompareArrows, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionAnalysisPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const byProduct = new Map<string, { planned: number; produced: number; batches: number; deviations: number }>();
    for (const batch of book.batches) {
      const row = byProduct.get(batch.productName) ?? { planned: 0, produced: 0, batches: 0, deviations: 0 };
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      row.batches += 1;
      byProduct.set(batch.productName, row);
    }
    for (const deviation of book.deviations) {
      const batch = deviation.batchId ? book.batches.find((b) => b.id === deviation.batchId) : undefined;
      const name = batch?.productName;
      if (!name) continue;
      const row = byProduct.get(name) ?? { planned: 0, produced: 0, batches: 0, deviations: 0 };
      row.deviations += 1;
      byProduct.set(name, row);
    }
    const rows = [...byProduct.entries()].map(([product, row]) => {
      const variance = row.produced - row.planned;
      const pct = row.planned > 0 ? Math.round((variance / row.planned) * 1000) / 10 : 0;
      return { product, ...row, variance, pct };
    });
    rows.sort((a, b) => a.pct - b.pct);

    const monthOf = (iso: string) => iso.slice(0, 7);
    const byMonth = new Map<string, { planned: number; produced: number }>();
    for (const batch of book.batches) {
      const row = byMonth.get(monthOf(batch.startedAt)) ?? { planned: 0, produced: 0 };
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      byMonth.set(monthOf(batch.startedAt), row);
    }
    const months = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, row]) => ({ month, ...row }));

    const planned = book.batches.reduce((sum, row) => sum + row.plannedUnits, 0);
    const produced = book.batches.reduce((sum, row) => sum + row.producedUnits, 0);
    const globalVariance = produced - planned;
    const globalPct = planned > 0 ? Math.round((globalVariance / planned) * 1000) / 10 : 0;
    return { rows, months, globalVariance, globalPct };
  }, [book]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Analysis</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production analysis</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Planned versus actual, product by product — the variance register that turns every short batch into a number
            you can act on.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><GitCompareArrows size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Global variance</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.globalVariance.toLocaleString()} units</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.globalPct >= 0 ? "+" : ""}{rows.globalPct}% vs plan</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TrendingDown size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Products short</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.rows.filter((row) => row.variance < 0).length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">under-produced vs plan</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TrendingUp size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Products over</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.rows.filter((row) => row.variance > 0).length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">beating their plan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Variance by product</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Most negative first — the biggest shortfalls lead.</p>
        </header>
        {rows.rows.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing to analyse until batches exist.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batches</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Planned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Variance</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Deviations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.rows.map((row) => (
                    <tr key={row.product}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.product}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.batches}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.planned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.produced.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums">
                        {row.variance > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><TrendingUp size={13} />+{row.pct}%</span>
                        ) : row.variance < 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-500"><TrendingDown size={13} />{row.pct}%</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-pos-ink-faint"><Minus size={13} />0%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.deviations || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>

      {rows.months.length > 1 && (
        <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4">
            <h2 className="font-semibold text-pos-ink">Monthly production vs plan</h2>
          </header>
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Month</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Planned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.months.map((row) => (
                    <tr key={row.month}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.month}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.planned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.produced.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums" style={{ color: row.produced >= row.planned ? "#10b981" : "#ef4444" }}>
                        {row.produced - row.planned > 0 ? "+" : ""}{row.produced - row.planned}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}