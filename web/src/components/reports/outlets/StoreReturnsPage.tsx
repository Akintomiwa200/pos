"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Store, Undo2, Wallet2 } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StoreReturnsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [docs, setDocs] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    Promise.all([
      listSales().catch(() => [] as HqSale[]),
      listDocs("sales-return").catch(() => [] as TradeDoc[]),
    ])
      .then(([s, d]) => {
        setSales(s);
        setDocs(d);
      })
      .catch(() => {
        setSales([]);
        setDocs([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !docs) return null;
    const storeKeys = new Set<string>();
    for (const sale of sales) {
      storeKeys.add((sale.storeName || "Unassigned").trim().toLowerCase());
    }
    const byStore = new Map<string, { count: number; amountMinor: number }>();
    for (const doc of docs) {
      const memo = `${doc.notes ?? doc.party ?? ""}`.toLowerCase();
      const match = [...storeKeys].find((key) => memo.includes(key));
      const store = match ?? "Unassigned";
      const row = byStore.get(store) ?? { count: 0, amountMinor: 0 };
      row.count += 1;
      row.amountMinor += doc.totalMinor;
      byStore.set(store, row);
    }
    const fromSales = new Map<string, { tickets: number; spendMinor: number }>();
    for (const sale of sales) {
      const key = (sale.storeName || "Unassigned").trim().toLowerCase();
      const row = fromSales.get(key) ?? { tickets: 0, spendMinor: 0 };
      row.tickets += 1;
      row.spendMinor += sale.totalMinor;
      fromSales.set(key, row);
    }
    const keys = new Set([...byStore.keys(), ...fromSales.keys()]);
    const lines = [...keys]
      .map((key) => {
        const returnRow = byStore.get(key);
        const saleRow = fromSales.get(key);
        const amountMinor = returnRow?.amountMinor ?? 0;
        const rate = saleRow && saleRow.spendMinor > 0 ? Math.round((amountMinor / saleRow.spendMinor) * 1000) / 10 : 0;
        return {
          store: key,
          returns: returnRow?.count ?? 0,
          amountMinor,
          grossMinor: saleRow?.spendMinor ?? 0,
          rate,
        };
      })
      .sort((a, b) => b.amountMinor - a.amountMinor);
    const total = lines.reduce((sum, row) => sum + row.amountMinor, 0);
    return { lines, total };
  }, [sales, docs]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Returns</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Returns by outlet</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Money handed back at each store — return documents matched to outlets by name, with the return rate against
            that store&apos;s own sales.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Outlets with returns</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.lines.filter((row) => row.returns).length}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">of {rows.lines.length} with sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Undo2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Returned value</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across return documents</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><RotateCcw size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Return docs</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.lines.reduce((sum, row) => sum + row.returns, 0)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">processed in total</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Return register</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Store attribution reads the store name out of each return&apos;s memo or supplier label.
          </p>
        </header>
        {rows.lines.filter((row) => row.returns).length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No returns recorded — refunds will appear here once sales returns are processed.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Outlet</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Return docs</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Returned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Gross sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Return rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) =>
                    row.returns ? (
                      <tr key={row.store} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium capitalize text-pos-ink">{row.store}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.returns}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-red-500">-{naira(row.amountMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.grossMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                            style={{
                              background: row.rate >= 5 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                              color: row.rate >= 5 ? "#ef4444" : "#10b981",
                            }}
                          >
                            {row.rate}%
                          </span>
                        </td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}