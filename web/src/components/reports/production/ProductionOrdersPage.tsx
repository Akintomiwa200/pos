"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, FlaskConical, XCircle } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const STATUS: Array<ProductionBook["batches"][number]["status"]> = ["planned", "in-progress", "completed", "cancelled"];

export function ProductionOrdersPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const filtered = status === "all" ? book.batches : book.batches.filter((row) => row.status === status);
    const sorted = [...filtered].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const counts = STATUS.reduce<Record<string, number>>((acc, s) => {
      acc[s] = book.batches.filter((row) => row.status === s).length;
      return acc;
    }, {});
    return { batches: sorted, counts };
  }, [book, status]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Production orders</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production orders</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every batch as a production order — what was planned, what actually came off the line, and where it sits in
            the workflow.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            {STATUS.map((s) => (
              <div key={s} className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white capitalize">
                  {s === "completed" ? <CheckCircle2 size={20} /> : s === "cancelled" ? <XCircle size={20} /> : <CircleDashed size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">{s}</p>
                  <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.counts[s]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-pos-ink">Batch register</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Newest first; filter by status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", ...STATUS].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  status === s ? "bg-pos-primary text-white" : "border border-pos-border text-pos-ink-muted hover:text-pos-ink"
                }`}
              >
                {s} {s === "all" ? rows.batches.length : ""}
              </button>
            ))}
          </div>
        </header>
        {rows.batches.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No orders in this state yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Order</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Planned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Yield</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Line</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Started</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.batches.map((row) => {
                    const pct = row.plannedUnits > 0 ? Math.round((row.producedUnits / row.plannedUnits) * 100) : 0;
                    return (
                      <tr key={row.id} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{row.number}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.productName}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.plannedUnits}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{row.producedUnits}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                            style={{
                              background: pct >= 100 ? "rgba(16,185,129,0.12)" : pct >= 85 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)",
                              color: pct >= 100 ? "#10b981" : pct >= 85 ? "#d97706" : "#ef4444",
                            }}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink-muted">{row.line ?? "—"}</td>
                        <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{new Date(row.startedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[13px] capitalize" style={{ color: colors.primary }}>
                            <FlaskConical size={13} /> {row.status}
                          </span>
                        </td>
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