"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, UserRound, UsersRound } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

type StaffRow = { batches: number; produced: number; planned: number; lines: Set<string>; deviations: number; wasteMinor: number };

export function ProductionStaffPage() {
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
    const byStaff = new Map<string, StaffRow>();
    const add = (staff: string, fn: (row: StaffRow) => void) => {
      if (!staff) return;
      const row = byStaff.get(staff) ?? { batches: 0, produced: 0, planned: 0, lines: new Set<string>(), deviations: 0, wasteMinor: 0 };
      fn(row);
      byStaff.set(staff, row);
    };
    for (const batch of book.batches) {
      add(batch.staff ?? "", (row) => {
        row.batches += 1;
        row.produced += batch.producedUnits;
        row.planned += batch.plannedUnits;
        if (batch.line) row.lines.add(batch.line);
      });
    }
    for (const deviation of book.deviations) {
      add(deviation.staff ?? "", (row) => {
        row.deviations += 1;
      });
    }
    for (const waste of book.waste) {
      add(waste.staff ?? "", (row) => {
        row.wasteMinor += Math.round(waste.quantity * waste.unitCostMinor);
      });
    }
    const staff = [...byStaff.entries()].map(([name, row]) => ({
      name,
      ...row,
      pct: row.planned > 0 ? Math.round((row.produced / row.planned) * 1000) / 10 : 0,
      lines: row.lines.size,
    }));
    staff.sort((a, b) => a.pct - b.pct);
    const totalProduced = staff.reduce((sum, row) => sum + row.produced, 0);
    const totalPlanned = staff.reduce((sum, row) => sum + row.planned, 0);
    return { staff, totalProduced, totalPlanned };
  }, [book]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Staff</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production staff</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Output attributed to the people on the floor — batches handled, units produced, and the flags that follow a
            name.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UsersRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Operators tracked</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.staff.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.totalProduced.toLocaleString()} units produced in total</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><AlertTriangle size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Tied deviations</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.staff.reduce((sum, row) => sum + row.deviations, 0)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">all attributed flags</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UserRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Lead operator</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">
                  {rows.staff.reduce((best, row) => (row.produced > (best?.produced ?? -1) ? row : best), null as (typeof rows.staff)[number] | null)?.name ?? "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">by units produced</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Per-operator scoreboard</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Most efficient first — deviation and waste flags sit alongside output.</p>
        </header>
        {rows.staff.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No names attached to batches yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Operator</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batches</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Vs plan</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Lines</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Deviations</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Waste value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {[...rows.staff].reverse().map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.batches}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.produced.toLocaleString()}</td>
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
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.lines}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.deviations || "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.wasteMinor ? `₦${Math.round(row.wasteMinor).toLocaleString()}` : "—"}</td>
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