"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleAlert, FlaskConical, Skull } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const SEVERITY: Array<ProductionBook["deviations"][number]["severity"]> = ["low", "medium", "high"];

export function ProductionDeviationsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [severity, setSeverity] = useState<string>("all");

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const filtered = severity === "all" ? book.deviations : book.deviations.filter((row) => row.severity === severity);
    const sorted = [...filtered].sort((a, b) => b.at.localeCompare(a.at));
    const batchFor = new Map(book.batches.map((b) => [b.id, b]));
    const counts = SEVERITY.reduce<Record<string, number>>((acc, s) => {
      acc[s] = book.deviations.filter((row) => row.severity === s).length;
      return acc;
    }, {});
    const lostUnits = book.deviations.reduce((sum, row) => sum + Math.max(0, row.expectedUnits - row.actualUnits), 0);
    const lostValue = book.deviations.reduce((sum, row) => sum + (row.amountMinor ?? 0), 0);
    return { rows: sorted, batchFor, counts, lostUnits, lostValue };
  }, [book, severity]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Deviations</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Deviations</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Missed yields, flagged at the stage they happened — expected versus actual, with the reason and the value at
            risk.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            {SEVERITY.map((s) => (
              <div key={s} className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 capitalize">
                  {s === "high" ? <Skull size={20} /> : s === "medium" ? <CircleAlert size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">{s} severity</p>
                  <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.counts[s]}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><FlaskConical size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Units lost</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lostUnits.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across all deviations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CircleAlert size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Value at risk</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.lostValue)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">recorded amount impact</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-pos-ink">Deviation register</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Filter by severity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", ...SEVERITY].map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  severity === s ? "bg-pos-primary text-white" : "border border-pos-border text-pos-ink-muted hover:text-pos-ink"
                }`}
              >
                {s} {s === "all" ? rows.rows.length : rows.counts[s]}
              </button>
            ))}
          </div>
        </header>
        {rows.rows.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No deviations recorded — the floor has been running clean.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batch</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Stage</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Expected</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Actual</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Shortfall</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reason</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Severity</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.rows.map((row) => {
                    const batch = row.batchId ? rows.batchFor.get(row.batchId) : undefined;
                    const short = row.expectedUnits - row.actualUnits;
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{batch?.number ?? (row.batchId ? row.batchId.slice(0, 8) : "—")}</td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink">{row.stage}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.expectedUnits.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.actualUnits.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-red-500">
                          {short > 0 ? `-${short.toLocaleString()}` : "0"}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-[13px] text-pos-ink-muted" title={row.reason}>{row.reason}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold capitalize"
                            style={{
                              background: row.severity === "high" ? "rgba(239,68,68,0.12)" : row.severity === "medium" ? "rgba(245,158,11,0.12)" : "rgba(14,165,233,0.12)",
                              color: row.severity === "high" ? "#ef4444" : row.severity === "medium" ? "#d97706" : "#0284c7",
                            }}
                          >
                            {row.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{new Date(row.at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}