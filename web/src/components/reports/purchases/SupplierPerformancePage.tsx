"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, Clock4, RotateCcw, Wallet } from "lucide-react";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const RECEIVED: string[] = ["received", "partial", "closed"];
const OWED: string[] = ["approved", "open", "partial"];

export function SupplierPerformancePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [invoices, setInvoices] = useState<TradeDoc[] | null>(null);
  const [returns, setReturns] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    Promise.all([listDocs("purchase-invoice"), listDocs("purchase-return")])
      .then(([i, r]) => {
        setInvoices(i);
        setReturns(r);
      })
      .catch(() => {
        setInvoices([]);
        setReturns([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!invoices || !returns) return null;
    const bySupplier = new Map<
      string,
      { supplier: string; orders: number; units: number; spentMinor: number; receivablesMinor: number; overdueDays: number; refunds: number; refundMinor: number; lastAt: string }
    >();
    for (const doc of invoices) {
      const supplier = doc.party || "Unknown supplier";
      const row = bySupplier.get(supplier) ?? {
        supplier,
        orders: 0,
        units: 0,
        spentMinor: 0,
        receivablesMinor: 0,
        overdueDays: 0,
        refunds: 0,
        refundMinor: 0,
        lastAt: doc.at,
      };
      if (RECEIVED.includes(doc.status)) {
        row.units += doc.lines.reduce((sum, line) => sum + line.quantity, 0);
        row.spentMinor += doc.totalMinor;
      }
      if (OWED.includes(doc.status)) {
        row.receivablesMinor += doc.totalMinor;
        const age = Math.max(0, Math.floor((Date.now() - new Date(doc.at).getTime()) / 86400000));
        row.overdueDays = Math.max(row.overdueDays, age);
      }
      if (doc.at > row.lastAt) row.lastAt = doc.at;
      bySupplier.set(supplier, row);
    }
    for (const doc of returns) {
      const supplier = doc.party || "Unknown supplier";
      const row = bySupplier.get(supplier) ?? {
        supplier,
        orders: 0,
        units: 0,
        spentMinor: 0,
        receivablesMinor: 0,
        overdueDays: 0,
        refunds: 0,
        refundMinor: 0,
        lastAt: doc.at,
      };
      if (RECEIVED.includes(doc.status)) {
        row.refunds += 1;
        row.refundMinor += doc.totalMinor;
      }
      bySupplier.set(supplier, row);
    }
    const suppliers = [...bySupplier.values()].sort((a, b) => b.spentMinor - a.spentMinor);
    const totalSpent = suppliers.reduce((sum, row) => sum + row.spentMinor, 0);
    return { suppliers, totalSpent };
  }, [invoices, returns]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const returnRate = (row: { spentMinor: number; refundMinor: number }) =>
    row.spentMinor ? Math.round((row.refundMinor / row.spentMinor) * 100) : 0;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Purchases · Supplier performance</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Supplier performance</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Spend, reliability and money outstanding with each supplier — turn this into leverage at renewal time.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Building2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Suppliers</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.suppliers.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">with purchase activity</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Recorded spend</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalSpent)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">on received invoices</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Per supplier</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Return rate = refunds ÷ spend · Outstanding = approved/open documents not yet received.
          </p>
        </header>
        {rows.suppliers.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No purchase activity yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Supplier</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Orders</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Received</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Spend</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Returns</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Return rate</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.suppliers.map((row) => (
                    <tr key={row.supplier} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.supplier}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.units.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.spentMinor)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[13px] tabular-nums ${row.refunds ? "text-pos-danger" : "text-pos-ink-muted"}`}>
                          {row.refunds ? `${naira(row.refundMinor)} (${row.refunds})` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{returnRate(row)}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[13px] font-semibold tabular-nums ${row.receivablesMinor ? "text-amber-600 dark:text-amber-400" : "text-pos-ink-muted"}`}>
                          {row.receivablesMinor ? naira(row.receivablesMinor) : "—"}
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

      <article className="mt-5 rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
            <Clock4 size={18} strokeWidth={1.75} />
          </span>
          <p className="text-sm text-pos-ink-muted">
            <span className="font-semibold text-pos-ink">Outstanding</span> counts approved/open purchase documents.
            The oldest such document age is surfaced as {rows.suppliers.reduce((max, r) => Math.max(max, r.overdueDays), 0)} days
            across your suppliers — settle the aged ones first.
          </p>
        </div>
      </article>
    </div>
  );
}