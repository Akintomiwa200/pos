"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Layers3, TrendingUp } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionInsightsPage() {
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
    const byLine = new Map<string, { batches: number; planned: number; produced: number; deviations: number; wasteMinor: number }>();
    for (const batch of book.batches) {
      const line = batch.line || "Unassigned";
      const row = byLine.get(line) ?? { batches: 0, planned: 0, produced: 0, deviations: 0, wasteMinor: 0 };
      row.batches += 1;
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      byLine.set(line, row);
    }
    for (const deviation of book.deviations) {
      if (!deviation.batchId) continue;
      const batch = book.batches.find((b) => b.id === deviation.batchId);
      const line = batch?.line || "Unassigned";
      const row = byLine.get(line) ?? { batches: 0, planned: 0, produced: 0, deviations: 0, wasteMinor: 0 };
      row.deviations += 1;
      byLine.set(line, row);
    }
    for (const waste of book.waste) {
      if (!waste.batchId) continue;
      const batch = book.batches.find((b) => b.id === waste.batchId);
      const line = batch?.line || "Unassigned";
      const row = byLine.get(line) ?? { batches: 0, planned: 0, produced: 0, deviations: 0, wasteMinor: 0 };
      row.wasteMinor += waste.quantity * waste.unitCostMinor;
      byLine.set(line, row);
    }
    const lines = [...byLine.entries()].map(([line, row]) => ({
      line,
      ...row,
      pct: row.planned > 0 ? Math.round((row.produced / row.planned) * 1000) / 10 : null,
      avgPerBatch: row.batches ? Math.round(row.produced / row.batches) : 0,
    }));
    lines.sort((a, b) => a.avgPerBatch - b.avgPerBatch || (a.pct ?? 0) - (b.pct ?? 0));

    const planned = book.batches.reduce((sum, row) => sum + row.plannedUnits, 0);
    const produced = book.batches.reduce((sum, row) => sum + row.producedUnits, 0);
    const overall = planned > 0 ? Math.round((produced / planned) * 1000) / 10 : null;
    const completed = book.batches.filter((row) => row.status === "completed");
    const completedPct = completed.length && book.batches.length
      ? Math.round((completed.length / book.batches.length) * 1000) / 10
      : null;
    const wasteMinor = book.waste.reduce((sum, row) => sum + row.quantity * row.unitCostMinor, 0);
    return { lines, overall, completedPct, wasteMinor, deviations: book.deviations.length, produced };
  }, [book]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Insights</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production insights</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The signals that show where the floor is losing efficiency — overall yield, completion pace, and per-line
            output against plan.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Gauge size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Overall yield</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.overall ?? "—"}%</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.produced.toLocaleString()} units produced</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Activity size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Completion rate</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.completedPct ?? "—"}%</p>
                <p className="mt-0.5 truncate text-xs text-white/60">of batches closed out</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Layers3 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Waste + deviations</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {naira(rows.wasteMinor)}{rows.deviations ? ` · ${rows.deviations}` : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">attention points</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Line performance</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Sorted by average units per batch — the lines dragging yield down float to the top.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No batches recorded — insights appear once production starts.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.lines.map((row) => (
              <div key={row.line} className="rounded-2xl border border-pos-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-pos-ink">{row.line}</p>
                  <p className="text-[13px] tabular-nums text-pos-ink-muted">
                    {row.batches} batch{row.batches === 1 ? "" : "es"} · avg {row.avgPerBatch.toLocaleString()} units{" "}
                    {row.deviations ? `· ${row.deviations} deviation${row.deviations === 1 ? "" : "s"}` : ""}{" "}
                    {row.wasteMinor ? `· ${naira(row.wasteMinor)} waste` : ""}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, row.pct ?? 0)}%`, background: (row.pct ?? 0) >= 100 ? "#10b981" : (row.pct ?? 0) >= 85 ? "#f59e0b" : "#ef4444" }}
                    />
                  </div>
                  <span className="w-16 text-right text-[13px] font-semibold tabular-nums" style={{ color: colors.primary }}>
                    {row.pct !== null ? `${row.pct}%` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}