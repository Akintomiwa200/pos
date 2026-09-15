"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, Landmark } from "lucide-react";
import { listCredits } from "@/lib/hq-customers";
import { api } from "@/lib/hq-api";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function parseTerms(terms: string) {
  const match = terms.match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

export function CashForecastPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [credits, setCredits] = useState<Array<{ customerName: string; balanceMinor: number; terms: string; lastSale?: string }> | null>(null);
  const [purchases, setPurchases] = useState<TradeDoc[] | null>(null);
  const [opening, setOpening] = useState(0);

  useEffect(() => {
    const open: string[] = [];
    Promise.all([
      listCredits().catch(() => []),
      listDocs("purchase-invoice").catch(() => []),
      api<Array<{ customerName?: string; paidAt: string; totalMinor: number }>>("/api/sales").catch(() => []),
    ]).then(([creditRows, purchaseRows, sales]) => {
      const byCustomer = new Map<string, { balanceMinor: number; terms: string; lastSale?: string }>();
      for (const row of creditRows as Array<{ customerName: string; balanceMinor: number; terms: string }>) {
        byCustomer.set(row.customerName.toLowerCase(), { balanceMinor: row.balanceMinor, terms: row.terms });
      }
      for (const sale of sales as Array<{ customerName?: string; paidAt: string }>) {
        if (!sale.customerName) continue;
        const key = sale.customerName.toLowerCase();
        const row = byCustomer.get(key);
        if (row) {
          if (!row.lastSale || sale.paidAt > row.lastSale) row.lastSale = sale.paidAt;
        }
      }
      const merged = [...byCustomer.entries()].map(([name, row]) => ({
        customerName: name,
        balanceMinor: row.balanceMinor,
        terms: row.terms,
        lastSale: row.lastSale,
      }));
      setCredits(merged);
      setPurchases(purchaseRows);
      const settled = (sales as Array<{ totalMinor: number }>).reduce((sum, sale) => sum + sale.totalMinor, 0);
      setOpening(settled);
    });
  }, []);

  const rows = useMemo(() => {
    if (!credits || !purchases) return null;
    const days = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);

    const inflow = [0, 0, 0, 0, 0];
    for (const credit of credits) {
      if (credit.balanceMinor <= 0) continue;
      const overdue = Math.max(0, days(credit.lastSale) - parseTerms(credit.terms));
      if (overdue === 0) inflow[0] += credit.balanceMinor;
      else if (overdue <= 30) inflow[1] += credit.balanceMinor;
      else if (overdue <= 60) inflow[2] += credit.balanceMinor;
      else if (overdue <= 90) inflow[3] += credit.balanceMinor;
      else inflow[4] += credit.balanceMinor;
    }

    const outflow = [0, 0, 0, 0, 0];
    for (const doc of purchases) {
      if (!["open", "partial", "approved"].includes(doc.status)) continue;
      const age = days(doc.at);
      if (age <= 30) outflow[0] += doc.totalMinor;
      else if (age <= 60) outflow[1] += doc.totalMinor;
      else if (age <= 90) outflow[2] += doc.totalMinor;
      else if (age <= 120) outflow[3] += doc.totalMinor;
      else outflow[4] += doc.totalMinor;
    }

    const labels = ["Due now", "7–30 days", "31–60 days", "61–90 days", "90+ days"];
    const buckets = labels.map((label, index) => ({
      label,
      inMinor: inflow[index],
      outMinor: outflow[index],
      netMinor: inflow[index] - outflow[index],
    }));
    let running = opening;
    const withBalance = buckets.map((bucket) => {
      running += bucket.netMinor;
      return { ...bucket, balanceMinor: running };
    });
    return { buckets: withBalance, opening };
  }, [credits, purchases, opening]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const finalBalance = rows.buckets.at(-1)?.balanceMinor ?? rows.opening;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Money · Cash forecast</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Cash forecast</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Expected short-term cash position: settled receipts as opening, receivables due as money in, open purchase
            invoices as money out, bucket by bucket.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Landmark size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Opening position</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.opening)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">settled sales receipts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CalendarClock size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Projected low point</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {naira(Math.min(rows.opening, ...rows.buckets.map((bucket) => bucket.balanceMinor)))}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">across the next buckets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ArrowUpFromLine size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Projected closing</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(finalBalance)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">after {rows.buckets.length} windows</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Forecast schedule</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Receivables age by credit terms vs last purchase; payables age by days an invoice has been open.
          </p>
        </header>
        {rows.buckets.every((bucket) => bucket.netMinor === 0) ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing aging yet — receivables, payables, or both will appear once customers owe and invoices open.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Window</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Money in</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Money out</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Net</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Running balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.buckets.map((bucket) => (
                    <tr key={bucket.label}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{bucket.label}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{bucket.inMinor ? naira(bucket.inMinor) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{bucket.outMinor ? naira(bucket.outMinor) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">
                        {bucket.netMinor > 0 ? <span className="text-emerald-600 dark:text-emerald-400">+{naira(bucket.netMinor)}</span> : naira(bucket.netMinor)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                        {naira(bucket.balanceMinor)}
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