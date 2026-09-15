"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Landmark, Store } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function tenderKind(tender: string) {
  const t = tender.toLowerCase();
  if (t.includes("cash")) return "Cash";
  if (t.includes("card") || t.includes("pos")) return "Card";
  if (t.includes("transfer") || t.includes("bank") || t.includes("credit")) return "Transfer";
  if (t.includes("wallet") || t.includes("loyalty") || t.includes("gift")) return "Wallet";
  return "Other";
}

export function StorePaymentsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales()
      .then(setSales)
      .catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const kinds = ["Cash", "Card", "Transfer", "Wallet", "Other"] as const;
    type TenderRow = Record<(typeof kinds)[number], number> & { store: string };
    const outlets = new Map<string, TenderRow>();
    for (const sale of sales) {
      const store = (sale.storeName || "Unassigned").trim();
      const kind = tenderKind(sale.tender);
      const existing = outlets.get(store);
      const row: TenderRow = existing ?? { store, Cash: 0, Card: 0, Transfer: 0, Wallet: 0, Other: 0 };
      row[kind] += sale.totalMinor;
      outlets.set(store, row);
    }
    const lines: TenderRow[] = [...outlets.values()].sort((a, b) => (a?.store ?? "").localeCompare(b?.store ?? ""));
    const totals = { Cash: 0, Card: 0, Transfer: 0, Wallet: 0, Other: 0 } as Record<string, number>;
    for (const row of lines) {
      for (const kind of kinds) totals[kind] += row[kind];
    }
    return { lines, kinds, totals, grand: Object.values(totals).reduce((sum, value) => sum + value, 0) };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Payments by outlet</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Payments by outlet</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            How each store gets paid — cash, card, transfer and wallet splits, so you know which tills need float today.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Banknote size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Cash taken</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totals.Cash)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.grand ? Math.round((rows.totals.Cash / rows.grand) * 100) : 0}% of tenders</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CreditCard size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Card taken</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totals.Card)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">at the counters</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Landmark size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Transfers + wallets</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {naira(rows.totals.Transfer + rows.totals.Wallet)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">trackable, no cash handling</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Tender mix by outlet</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Tender labels are read from the till (cash/card/transfer/wallet/other by keyword).
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No payments recorded — settled receipts appear here by store.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Outlet</th>
                    {rows.kinds.map((kind) => (
                      <th key={kind} className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                        {kind}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.store} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.store}</td>
                      {rows.kinds.map((kind) => (
                        <td key={kind} className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">
                          {row[kind] ? naira(row[kind]) : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                        {naira(rows.kinds.reduce((sum, kind) => sum + row[kind], 0))}
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