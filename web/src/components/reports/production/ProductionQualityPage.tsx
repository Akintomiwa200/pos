"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BadgeX, FlaskConical, ShieldCheck } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionQualityPage() {
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
    const completed = book.batches.filter((row) => row.status === "completed");
    const batchFor = new Map(book.batches.map((b) => [b.id, b]));
    const qualityDev = book.deviations.filter((row) => row.severity === "high");
    const firstPass = (batch: ProductionBook["batches"][number]) => {
      const related = book.deviations.filter((d) => d.batchId === batch.id && d.severity === "high");
      return related.length === 0;
    };
    const firstPassPct = completed.length ? Math.round((completed.filter(firstPass).length / completed.length) * 1000) / 10 : 0;
    const qualityYield = book.batches.length
      ? Math.round((completed.filter(firstPass).reduce((sum, row) => sum + row.producedUnits, 0) / completed.reduce((sum, row) => sum + row.producedUnits, 0) || 0) * 1000) / 10
      : 0;
    const issues = [...qualityDev]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((row) => ({ ...row, batch: row.batchId ? batchFor.get(row.batchId) : undefined }));
    return { completed, batchFor, firstPassPct, qualityYield, issues };
  }, [book]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Quality</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Quality</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            First-pass yield and the high-severity deviations that threaten it — quality control read from the batch
            register itself.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BadgeCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">First-pass rate</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.firstPassPct}%</p>
                <p className="mt-0.5 truncate text-xs text-white/60">of closed batches without high deviations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShieldCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Quality yield</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.qualityYield}%</p>
                <p className="mt-0.5 truncate text-xs text-white/60">good units as share of all completed output</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BadgeX size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">High-severity flags</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.issues.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">deviations needing review</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Quality flags</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">High-severity deviations, newest first.</p>
        </header>
        {rows.issues.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No high-severity deviations — quality is holding.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.issues.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-pos-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-red-500" style={{ background: "rgba(239,68,68,0.12)" }}>
                    <FlaskConical size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-pos-ink">{row.stage}</p>
                    <p className="truncate text-[12px] text-pos-ink-muted">
                      {row.batch?.number ?? "standalone"} · {row.reason}
                    </p>
                  </div>
                </div>
                <span className="text-[12px] tabular-nums text-pos-ink-faint">{new Date(row.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}