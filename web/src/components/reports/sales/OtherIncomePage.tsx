"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, HandCoins } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { dayKey, naira, prettyDay } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function OtherIncomePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales().then(setSales).catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const other = sales.filter((sale) => !(sale.lines ?? []).length);
    const byDay = new Map<string, { day: string; count: number; totalMinor: number }>();
    const byTender = new Map<string, { tender: string; count: number; totalMinor: number }>();
    for (const sale of other) {
      const day = dayKey(sale.paidAt);
      const row = byDay.get(day) ?? { day, count: 0, totalMinor: 0 };
      row.count += 1;
      row.totalMinor += sale.totalMinor;
      byDay.set(day, row);
      const tender = sale.tender?.trim() || "Other";
      const tRow = byTender.get(tender) ?? { tender, count: 0, totalMinor: 0 };
      tRow.count += 1;
      tRow.totalMinor += sale.totalMinor;
      byTender.set(tender, tRow);
    }
    const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    const totalMinor = other.reduce((sum, sale) => sum + sale.totalMinor, 0);
    const tenders = [...byTender.values()].sort((a, b) => b.totalMinor - a.totalMinor);
    return { days, totalMinor, tenders, count: other.length };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · Other income</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Other income</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Payments received that carry no product lines — deposits, service charges, commissions and standing
            receipts — counted as income outside product sales.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><HandCoins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Other income</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.count} receipts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CalendarDays size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Days with income</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.days.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">of {rows.days.length} shown below</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4">
            <h2 className="font-semibold text-pos-ink">Daily other income</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Each day recording receipts with no product lines.</p>
          </header>
          {rows.days.length === 0 ? (
            <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
              No other income recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-pos-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse">
                  <thead>
                    <tr className="border-b border-pos-border bg-pos-surface-muted">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Day</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Receipts</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/60">
                    {rows.days.map((row) => (
                      <tr key={row.day} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{prettyDay(row.day)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.count}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">By payment method</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">How those receipts were paid</p>
          </header>
          <ul className="mt-4 space-y-3">
            {rows.tenders.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">Nothing recorded yet.</p>
            ) : (
              rows.tenders.map((row) => (
                <li key={row.tender}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-pos-ink">
                      <BadgeCheck size={14} className="text-pos-ink-faint" />
                      <span className="capitalize">{row.tender}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${rows.totalMinor ? (row.totalMinor / rows.totalMinor) * 100 : 0}%`, background: colors.primary }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </div>
  );
}