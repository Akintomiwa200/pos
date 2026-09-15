"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Clock3, ReceiptText, Wallet2 } from "lucide-react";
import { api } from "@/lib/hq-api";
import { listCredits } from "@/lib/hq-customers";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function parseTerms(terms: string) {
  const match = terms.match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

type CreditRow = { customerId: string; customerName: string; balanceMinor: number; terms: string };

export function ReceivablesAgingPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [credits, setCredits] = useState<CreditRow[] | null>(null);
  const [lastSales, setLastSales] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const inject = (fn: () => Promise<CreditRow[]>) => fn();
    Promise.all([
      inject(() => listCredits().then((rows) =>
        rows.map((row) => ({
          customerId: row.customerId,
          customerName: row.customerName,
          balanceMinor: row.balanceMinor,
          terms: row.terms,
        })),
      )),
      api<Array<{ customerName?: string; paidAt: string }>>("/api/sales").catch(() => []),
    ])
      .then(([creditRows, salesRows]) => {
        const last = new Map<string, string>();
        for (const sale of salesRows) {
          if (!sale.customerName) continue;
          const key = sale.customerName.trim().toLowerCase();
          if (!last.has(key) || sale.paidAt > (last.get(key) ?? "")) last.set(key, sale.paidAt);
        }
        setCredits(creditRows);
        setLastSales(last);
      })
      .catch(() => setCredits([]));
  }, []);

  const rows = useMemo(() => {
    if (!credits) return null;
    const bucketOf = (overdue: number) => (overdue === 0 ? 0 : overdue <= 30 ? 1 : overdue <= 60 ? 2 : overdue <= 90 ? 3 : 4);
    const totals = [0, 0, 0, 0, 0];
    const lines = credits
      .filter((credit) => credit.balanceMinor > 0)
      .map((credit) => {
        const lastSale = lastSales.get(credit.customerName.trim().toLowerCase());
        const daysSince = lastSale ? Math.max(0, Math.floor((Date.now() - new Date(lastSale).getTime()) / 86400000)) : 0;
        const overdue = Math.max(0, daysSince - parseTerms(credit.terms));
        const bucket = bucketOf(overdue);
        totals[bucket] += credit.balanceMinor;
        return { ...credit, lastSale, daysSince, overdue, bucket };
      })
      .sort((a, b) => b.bucket - a.bucket || b.balanceMinor - a.balanceMinor);
    const total = totals.reduce((sum, value) => sum + value, 0);
    return { lines, totals, total };
  }, [credits, lastSales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const labels = ["Current", "1–30 days", "31–60 days", "61–90 days", "90+ days"];

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Money · Receivables aging</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Receivables aging</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            What each customer owes right now, aged against their credit terms — overdue a day is a day you are lending
            them money.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ReceiptText size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Accounts with balances</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">holding receivable balances</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Clock3 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total receivable</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across all credit accounts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Past due</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight" style={{ color: "#fbbf24" }}>
                  {naira(rows.total - rows.totals[0])}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">overdue on the timetable</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Aging schedule</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Overdue days = days since last purchase − credit terms. Split by balance, not by invoice.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nobody owes you right now — receivables appear as customers buy on credit.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-pos-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse">
                  <thead>
                    <tr className="border-b border-pos-border bg-pos-surface-muted">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Last purchase</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Days overdue</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/60">
                    {rows.lines.map((row) => (
                      <tr key={row.customerId}>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-pos-ink">{row.customerName}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                          {row.lastSale ? new Date(row.lastSale).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                            style={
                              row.overdue === 0
                                ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                                : row.overdue <= 60
                                  ? { background: "rgba(251,191,36,0.12)", color: "#d97706" }
                                  : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                            }
                          >
                            {row.overdue === 0 ? "Current" : `${row.overdue}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.balanceMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-pos-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr className="border-b border-pos-border bg-pos-surface-muted">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                        <CalendarRange size={13} className="mr-1 inline" /> Aging bucket
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/60">
                    {rows.totals.map((value, index) => (
                      <tr key={labels[index]}>
                        <td className="px-4 py-3 text-[13px] text-pos-ink">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full align-middle"
                            style={{
                              background:
                                index === 0 ? "#10b981" : index === 1 ? "#22c55e" : index === 2 ? "#f59e0b" : index === 3 ? "#f97316" : "#ef4444",
                            }}
                          />
                          <span className="ml-2 align-middle">{labels[index]}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(value)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                          {rows.total > 0 ? `${Math.round((value / rows.total) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}