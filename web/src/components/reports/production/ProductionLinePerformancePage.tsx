"use client";

import { useEffect, useMemo, useState } from "react";
import { Factory, Gauge, ListChecks, Timer } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionLinePerformancePage() {
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
    const byLine = new Map<string, { batches: number; completed: number; planned: number; produced: number; mix: Set<string> }>();
    for (const batch of book.batches) {
      const line = batch.line || "Unassigned";
      const row = byLine.get(line) ?? { batches: 0, completed: 0, planned: 0, produced: 0, mix: new Set<string>() };
      row.batches += 1;
      if (batch.status === "completed") row.completed += 1;
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      row.mix.add(batch.productName);
      byLine.set(line, row);
    }
    const lines = [...byLine.entries()].map(([line, row]) => ({
      line,
      ...row,
      mix: row.mix.size,
      pct: row.planned > 0 ? Math.round((row.produced / row.planned) * 1000) / 10 : 0,
      avgPerBatch: row.batches ? Math.round(row.produced / row.batches) : 0,
      completionPct: row.batches ? Math.round((row.completed / row.batches) * 1000) / 10 : 0,
    }));
    lines.sort((a, b) => a.pct - b.pct);
    const produced = lines.reduce((sum, row) => sum + row.produced, 0);
    const planned = lines.reduce((sum, row) => sum + row.planned, 0);
    return { lines, produced, planned };
  }, [book]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Line performance</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Line performance</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Each production line scored on throughput, completion pace and product mix — the factory sorted weakest
            first.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Factory size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Active lines</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">including unassigned</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Timer size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Throughput</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.produced.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">units against {rows.planned.toLocaleString()} planned</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ListChecks size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Best yield</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">
                  {rows.lines.reduce((best, row) => (row.pct > (best?.pct ?? -1) ? row : best), null as (typeof rows.lines)[number] | null)?.line ?? "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  at {rows.lines.reduce((best, row) => (row.pct > (best?.pct ?? -1) ? row : best), null as (typeof rows.lines)[number] | null)?.pct ?? 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Line scoreboard</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Yield against plan leads, then completion pace and product breadth.</p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No lines logged yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Line</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batches</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Completed</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Avg/batch</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Products</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Output vs plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.line}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.line}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.batches}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.completed} <span className="text-pos-ink-faint">({row.completionPct}%)</span></td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.avgPerBatch.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.mix}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums"
                          style={{
                            background: row.pct >= 100 ? "rgba(16,185,129,0.12)" : row.pct >= 85 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)",
                            color: row.pct >= 100 ? "#10b981" : row.pct >= 85 ? "#d97706" : "#ef4444",
                          }}
                        >
                          {row.pct}%
                        </span>
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