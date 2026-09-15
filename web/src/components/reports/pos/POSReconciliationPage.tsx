"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Coins, RotateCcw, Scale, Wallet } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDocs, naira, paymentFeed, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function POSReconciliationPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [returns, setReturns] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listDocs("sales-return"), paymentFeed()])
      .then(([s, r, feed]) => {
        setSales(s);
        setReturns(r);
        const settlements = new Map(feed.settlements.map((row) => [row.tender.toLowerCase(), row]));
        setSettlementData(settlements);
      })
      .catch(() => {
        setSales([]);
        setReturns([]);
        setSettlementData(new Map());
      });
  }, []);

  const [settlementData, setSettlementData] = useState<Map<string, { tender: string; totalMinor: number; count: number }>>(new Map());

  const rows = useMemo(() => {
    if (!sales || !returns) return null;
    const byTender = new Map<string, { tender: string; count: number; expectedMinor: number }>();
    for (const sale of sales) {
      const tender = sale.tender?.trim() || "Other";
      const row = byTender.get(tender) ?? { tender, count: 0, expectedMinor: 0 };
      row.count += 1;
      row.expectedMinor += sale.totalMinor;
      byTender.set(tender, row);
    }
    const tenders = [...byTender.values()].sort((a, b) => b.expectedMinor - a.expectedMinor);
    const reconciled = tenders.map((row) => {
      const counted = settlementData.get(row.tender.toLowerCase());
      const countedMinor = counted?.totalMinor ?? null;
      return {
        ...row,
        countedMinor,
        variance: counted === undefined ? null : counted.totalMinor - row.expectedMinor,
      };
    });
    return { tenders: reconciled, refunds: returns };
  }, [sales, returns, settlementData]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const expectedTotal = rows.tenders.reduce((sum, row) => sum + row.expectedMinor, 0);
  const refundTotal = rows.refunds.reduce((sum, doc) => sum + doc.totalMinor, 0);

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Reconciliation</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">POS reconciliation & exceptions</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Register-level expected vs counted money by tender, plus the exception register — refunds and voids that
            shift a cash drawer.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Expected receipts</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(expectedTotal)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across all tenders</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><RotateCcw size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Refund exceptions</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(refundTotal)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.refunds.length} refund documents</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
              <Scale size={16} />
            </span>
            <h2 className="font-semibold text-pos-ink">Expected vs counted, by tender</h2>
          </header>
          {rows.tenders.length === 0 ? (
            <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
              No till sales recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.tenders.map((row) => {
                const variance = row.variance;
                const status =
                  variance === null ? "no count" : variance === 0 ? "balanced" : Math.abs(variance ?? 0) <= 100 ? "balanced" : "difference";
                const color =
                  status === "difference"
                    ? "text-pos-danger"
                    : status === "no count"
                      ? "text-pos-ink-faint"
                      : "text-emerald-600 dark:text-emerald-400";
                return (
                  <div key={row.tender} className="rounded-2xl border border-pos-border p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-medium capitalize text-pos-ink">
                        <Coins size={14} className="text-pos-ink-faint" />
                        {row.tender}
                      </span>
                      <span className={`text-[12px] font-semibold capitalize ${color}`}>{status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                      <span className="tabular-nums text-pos-ink-muted">
                        Expected {naira(row.expectedMinor)} · {row.count} tickets
                      </span>
                      <span className="tabular-nums text-pos-ink-muted">
                        Counted {row.countedMinor === null ? "—" : naira(row.countedMinor)}
                      </span>
                      <span className={`font-semibold tabular-nums ${row.variance === null ? "text-pos-ink-faint" : row.variance === 0 ? "text-emerald-600" : "text-pos-danger"}`}>
                        {row.variance === null ? "—" : row.variance > 0 ? `+${naira(row.variance)}` : naira(row.variance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-pos-danger/10 text-pos-danger">
              <BadgeCheck size={16} />
            </span>
            <h2 className="font-semibold text-pos-ink">Exception register</h2>
          </header>
          {rows.refunds.length === 0 ? (
            <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
              No refunds yet — the drawer is clean.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-pos-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse">
                  <thead>
                    <tr className="border-b border-pos-border bg-pos-surface-muted">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Refund</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/60">
                    {rows.refunds.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-pos-ink">{doc.number}</td>
                        <td className="px-4 py-2.5 text-[12px] text-pos-ink-muted">{doc.party || "—"}</td>
                        <td className="px-4 py-2.5 text-right text-[12px] font-semibold tabular-nums text-pos-danger">{naira(doc.totalMinor)}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-pos-ink-muted">
                            {doc.status}
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
    </div>
  );
}