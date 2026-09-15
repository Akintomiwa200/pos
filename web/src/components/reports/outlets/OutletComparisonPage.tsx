"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, Store, Trophy, Wallet2 } from "lucide-react";
import { listStores, type HqStore } from "@/lib/hq-setup";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function OutletComparisonPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [stores, setStores] = useState<HqStore[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [returns, setReturns] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    Promise.all([
      listStores().catch(() => [] as HqStore[]),
      listSales().catch(() => [] as HqSale[]),
      listDocs("sales-return").catch(() => [] as TradeDoc[]),
    ])
      .then(([s, r, d]) => {
        setStores(s);
        setSales(r);
        setReturns(d);
      })
      .catch(() => {
        setStores([]);
        setSales([]);
        setReturns([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!stores || !sales || !returns) return null;
    const salesByStore = new Map<string, { tickets: number; spendMinor: number }>();
    for (const sale of sales) {
      const key = sale.storeId ?? (sale.storeName || "Unassigned").trim();
      const row = salesByStore.get(key) ?? { tickets: 0, spendMinor: 0 };
      row.tickets += 1;
      row.spendMinor += sale.totalMinor;
      salesByStore.set(key, row);
    }
    const refundByStore = new Map<string, number>();
    for (const doc of returns) {
      const memoKey = `${doc.notes ?? ""}`.toLowerCase();
      if (!memoKey) continue;
      const storeKey = [...salesByStore.keys()].find((name) => memoKey.includes(name.toLowerCase()));
      if (storeKey) refundByStore.set(storeKey, (refundByStore.get(storeKey) ?? 0) + doc.totalMinor);
    }
    const lines = stores.map((store) => {
      const tagged = salesByStore.get(store.id) ?? salesByStore.get(store.name);
      const refund = refundByStore.get(store.name) ?? 0;
      return {
        store,
        tickets: tagged?.tickets ?? 0,
        spendMinor: tagged?.spendMinor ?? 0,
        refund,
        netMinor: (tagged?.spendMinor ?? 0) - refund,
        avgMinor: tagged?.tickets ? Math.round((tagged?.spendMinor ?? 0) / tagged.tickets) : 0,
      };
    });
    lines.sort((a, b) => b.spendMinor - a.spendMinor);
    const grand = lines.reduce((sum, row) => sum + row.spendMinor, 0);
    const best = lines[0];
    return { lines, grand, best };
  }, [stores, sales, returns]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const maxBasket = Math.max(...rows.lines.map((row) => row.avgMinor), 1);
  const maxTickets = Math.max(...rows.lines.map((row) => row.tickets), 1);

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Comparison</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Outlet comparison</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            All stores side by side on the numbers that matter — gross sales, returns, net collect, and average basket.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stores compared</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">registered outlets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Trophy size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Top store</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">{rows.best?.store.name ?? "—"}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.best ? naira(rows.best.spendMinor) : ""} gross</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Network sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.grand)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {rows.lines.length} outlets</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Side-by-side</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Bars scale to the leader in their column; returns come from refund documents whose memo names the outlet.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Add stores in Setup to start comparing outlets.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Store</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Tickets</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Avg basket</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Gross</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Returns</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.store.id}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.store.name}</td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-pos-border">
                          <div className="h-full rounded-full" style={{ width: `${(row.tickets / maxTickets) * 100}%`, background: colors.primary }} />
                        </div>
                        <span className="mt-1 block text-[12px] tabular-nums text-pos-ink-muted">{row.tickets}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-pos-border">
                          <div className="h-full rounded-full" style={{ width: `${(row.avgMinor / maxBasket) * 100}%`, background: "#22c55e" }} />
                        </div>
                        <span className="mt-1 block text-[12px] tabular-nums text-pos-ink-muted">{naira(row.avgMinor)}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.spendMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-red-500">{row.refund ? `-${naira(row.refund)}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                        {naira(row.netMinor)}
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