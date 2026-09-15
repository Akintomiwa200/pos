"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDashed, Gauge, Hammer } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en", { month: "long", year: "numeric" }) };
});

export function ProductionSchedulePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [month, setMonth] = useState(MONTHS[0].key);

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const inMonth = book.batches.filter((row) => row.startedAt.startsWith(month));
    const sorted = [...inMonth].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const byDay = new Map<string, number>();
    for (const row of sorted) {
      const day = row.startedAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { sorted, days };
  }, [book, month]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Schedule</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production schedule</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The plan load, day by day — when each batch was scheduled to start and where its output lands.
          </p>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMonth(m.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${month === m.key ? "bg-white text-pos-primary" : "bg-white/15 text-white hover:bg-white/25"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-[12px] bg-white/10 px-4 py-2 text-sm text-white">
              <CalendarDays size={16} />
              <span className="font-semibold tabular-nums">{rows.sorted.length}</span> sessions in {MONTHS.find((m) => m.key === month)?.label}
            </div>
          </div>
        </div>
      </section>

      {rows.days.length > 0 ? (
        <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4">
            <h2 className="font-semibold text-pos-ink">Load by day</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Start dates scheduled for {MONTHS.find((m) => m.key === month)?.label}.</p>
          </header>
          <div className="space-y-2">
            {rows.days.map(([day, count]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[13px] text-pos-ink-muted">
                  {new Date(day).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                  <div className="h-full rounded-full" style={{ width: `${(count / (rows.days[0]?.[1] ?? count)) * 100}%`, background: colors.primary }} />
                </div>
                <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{count}</span>
              </div>
            ))}
          </div>
        </article>
      ) : (
        <article className="mt-5 grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border bg-pos-surface text-sm text-pos-ink-faint">
          No batches scheduled this month.
        </article>
      )}

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Month timeline</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Earliest start first.</p>
        </header>
        {rows.sorted.length === 0 ? (
          <div className="grid h-[140px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing on the timeline.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Start</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batch</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Planned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.sorted.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">
                        {new Date(row.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{row.number}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.productName}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.plannedUnits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.producedUnits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[13px] capitalize" style={{ color: colors.primary }}>{row.status}</td>
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