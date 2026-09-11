"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale, ShieldCheck } from "lucide-react";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { aggregateSales, dayKey, naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

const CREDIT_HINTS = ["credit", "due", "owe", "receivable"];

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function isCredit(sale: HqSale) {
  return CREDIT_HINTS.some((hint) => sale.tender.toLowerCase().includes(hint));
}

export function InvoiceBalancePage() {
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const aggregate = useMemo(() => (sales ? aggregateSales(sales) : null), [sales]);

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  const creditTickets = sales.filter(isCredit);
  const creditMinor = creditTickets.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const collectedMinor = aggregate.revenueMinor - creditMinor;
  const outstandingMinor = [...creditTickets].reverse().reduce((sum, sale, index, arr) => {
    if (index < 3) return sum + sale.totalMinor;
    return sum;
  }, 0);

  const collectedShare = aggregate.revenueMinor > 0 ? Math.round((collectedMinor / aggregate.revenueMinor) * 100) : 0;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Sales · Invoice
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Invoice balance</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Collected at the till versus anything still riding on a credit tender.
        </p>
      </header>

      <section className="mb-5 rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
          <Scale size={14} /> Settlement position
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-8">
          <div>
            <p className="text-sm text-pos-ink-muted">Billed in total</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-pos-ink">
              {naira(aggregate.revenueMinor)}
            </p>
            <p className="mt-1 text-xs text-pos-ink-faint">{aggregate.tickets} tickets across all tenders</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold tabular-nums text-pos-success dark:bg-emerald-950/40 dark:text-emerald-300">
              <ArrowDownLeft size={16} /> Collected {naira(collectedMinor)}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold tabular-nums text-pos-danger dark:bg-rose-950/40 dark:text-rose-300">
              <ArrowUpRight size={16} /> On credit {naira(creditMinor)}
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-full bg-pos-surface-muted">
          <div
            className="h-3 rounded-full bg-pos-success transition-all"
            style={{ width: `${collectedShare}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-pos-ink-faint">
          <span>{collectedShare}% collected at the till</span>
          <span>{100 - collectedShare}% outstanding</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex items-center justify-between border-b border-pos-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-pos-ink">Outstanding tickets</h2>
              <p className="mt-0.5 text-xs text-pos-ink-faint">
                {creditTickets.length} on credit tenders
              </p>
            </div>
            <span className="text-lg font-bold tabular-nums text-pos-danger">{naira(creditMinor)}</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ minWidth: 560 }}>
              <thead className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                <tr>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Cashier</th>
                  <th className="px-5 py-3">Tender</th>
                  <th className="px-5 py-3 text-right">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/50">
                {creditTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-pos-ink-faint">
                      <ShieldCheck size={28} className="mx-auto mb-2 opacity-40 text-pos-success" />
                      Everything was collected at the till — nothing outstanding.
                    </td>
                  </tr>
                ) : (
                  creditTickets.map((sale) => (
                    <tr key={sale.ticketId} className="hover:bg-pos-surface-muted/60">
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-pos-ink-muted">
                        {sale.ticketId}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {prettyDay(dayKey(sale.paidAt))} · {timeOf(sale.paidAt)}
                      </td>
                      <td className="px-5 py-3.5">{sale.cashierName || "—"}</td>
                      <td className="px-5 py-3.5 capitalize text-pos-ink-muted">{sale.tender}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-pos-danger">
                        {naira(sale.totalMinor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-pos-ink">Collected breakdown</h2>
              <p className="mt-0.5 text-xs text-pos-ink-faint">By tender, on settled sales</p>
            </div>
            <span className="text-lg font-bold tabular-nums text-pos-success">{naira(collectedMinor)}</span>
          </header>
          {aggregate.byTender.length === 0 ? (
            <p className="py-10 text-center text-sm text-pos-ink-faint">No settlements yet.</p>
          ) : (
            <ul className="space-y-3">
              {aggregate.byTender.map((row) => {
                const credit = isCredit({ tender: row.tender } as HqSale);
                const settled = !credit ? row.totalMinor : 0;
                return (
                  <li
                    key={row.tender}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                      credit
                        ? "bg-rose-50/60 dark:bg-rose-950/20"
                        : "bg-emerald-50/60 dark:bg-emerald-950/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full ${
                          credit ? "bg-rose-100 text-pos-danger" : "bg-emerald-100 text-pos-success"
                        }`}
                      >
                        {credit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </span>
                      <div>
                        <p className="text-sm font-medium capitalize text-pos-ink">{row.tender}</p>
                        <p className="text-xs text-pos-ink-faint">{row.count} payments</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-pos-ink">
                      {settled > 0 ? naira(settled) : `${naira(row.totalMinor)} on credit`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {outstandingMinor > 0 ? (
            <p className="mt-4 rounded-2xl bg-pos-surface-muted p-4 text-xs leading-relaxed text-pos-ink-faint">
              The three newest outstanding tickets alone sum to <span className="font-semibold text-pos-ink">{naira(outstandingMinor)}</span>.
              Follow up on credit tenders to convert them into settled cash.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}