"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, ShoppingBag, Trophy, UserRound } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StaffPerformancePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [refunds, setRefunds] = useState<TradeDoc[] | null>(null);
  const [staff, setStaff] = useState<DirectoryRecord[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listDocs("sales-return"), listDirectory("staff")])
      .then(([s, r, d]) => {
        setSales(s);
        setRefunds(r);
        setStaff(d);
      })
      .catch(() => {
        setSales([]);
        setRefunds([]);
        setStaff([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !refunds || !staff) return null;
    const byName = new Map<string, { cashierName: string; tickets: number; units: number; totalMinor: number; cashMinor: number }>();
    for (const sale of sales) {
      const name = sale.cashierName || "Unknown";
      const row = byName.get(name) ?? { cashierName: name, tickets: 0, units: 0, totalMinor: 0, cashMinor: 0 };
      row.tickets += 1;
      row.units += (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
      row.totalMinor += sale.totalMinor;
      if (sale.tender?.toLowerCase().includes("cash")) row.cashMinor += sale.totalMinor;
      byName.set(name, row);
    }
    const refundBy = new Map<string, { count: number; amountMinor: number }>();
    for (const doc of refunds) {
      const who = doc.createdBy || doc.approvedBy || "Unknown";
      const row = refundBy.get(who) ?? { count: 0, amountMinor: 0 };
      row.count += 1;
      row.amountMinor += doc.totalMinor;
      refundBy.set(who, row);
    }
    const allNames = new Set<string>();
    for (const name of byName.keys()) allNames.add(name);
    for (const name of refundBy.keys()) allNames.add(name);
    for (const s of staff) allNames.add(s.name);
    const list = [...allNames].map((name) => {
      const soldKey = [...byName.keys()].find((key) => key.toLowerCase() === name.toLowerCase());
      const sold = soldKey
        ? byName.get(soldKey)!
        : { cashierName: name, tickets: 0, units: 0, totalMinor: 0, cashMinor: 0 };
      const refund = refundBy.get(name) ?? { count: 0, amountMinor: 0 };
      return { name, ...sold, refunds: refund.count, refundMinor: refund.amountMinor };
    });
    const sorted = list
      .filter((row) => row.tickets > 0 || row.name !== "Unknown")
      .sort((a, b) => b.totalMinor - a.totalMinor);
    const grand = sorted.reduce((sum, row) => sum + row.totalMinor, 0);
    return { staff: sorted, grand, units: sorted.reduce((sum, row) => sum + row.units, 0) };
  }, [sales, refunds, staff]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const best = rows.staff.at(0);

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · Staff performance</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Staff performance</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            What each person sold, how much they rung in cash, and what they refunded — from till records, refund
            documents and the staff directory.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UserRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Staff with activity</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.staff.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{naira(rows.grand)} total sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Trophy size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Top performer</p>
                {best && best.totalMinor > 0 ? (
                  <>
                    <p className="mt-1 truncate text-xl font-bold tracking-tight">{best.name}</p>
                    <p className="mt-0.5 truncate text-xs text-white/60">{naira(best.totalMinor)} · {best.tickets} tickets</p>
                  </>
                ) : (
                  <p className="mt-1 text-xl font-semibold tracking-tight">—</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Per person</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Sorted by sales; refunds come from approved sales-return documents.</p>
        </header>
        {rows.staff.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No sales recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Staff</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Units</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Avg ticket</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Cash rung</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Refunds ({rows.staff.reduce((s, r) => s + r.refunds, 0)})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.staff.map((row, index) => (
                    <tr key={row.name} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-pos-ink">
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                              index === 0 ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
                            }`}
                          >
                            {index + 1}
                          </span>
                          {row.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.units.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {naira(row.tickets ? Math.round(row.totalMinor / row.tickets) : 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.cashMinor)}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-[13px] font-semibold tabular-nums ${
                            row.refunds ? "text-pos-danger" : "text-pos-ink-muted"
                          }`}
                        >
                          {row.refunds ? `${naira(row.refundMinor)} (${row.refunds})` : "—"}
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