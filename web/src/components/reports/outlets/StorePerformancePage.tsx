"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, ReceiptText, Store, Wallet2 } from "lucide-react";
import { listStores, type HqStore } from "@/lib/hq-setup";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StorePerformancePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [stores, setStores] = useState<HqStore[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listStores().catch(() => [] as HqStore[]), listSales().catch(() => [] as HqSale[])])
      .then(([s, r]) => {
        setStores(s);
        setSales(r);
      })
      .catch(() => {
        setStores([]);
        setSales([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!stores || !sales) return null;
    const byStore = new Map<string, HqSale[]>();
    for (const sale of sales) {
      const key = sale.storeId ?? (sale.storeName || "Unassigned").trim();
      byStore.set(key, [...(byStore.get(key) ?? []), sale]);
    }
    const defaultStores = [
      ...stores,
      ...[...byStore.keys()]
        .filter((key) => !stores.some((store) => store.id === key || store.name === key))
        .map((key) => ({ id: key, name: key, kind: "retail" as const, address: "", active: true })),
    ];
    const lines = defaultStores.map((store) => {
      const tagged = byStore.get(store.id) ?? byStore.get(store.name) ?? [];
      const spendMinor = tagged.reduce((sum, sale) => sum + sale.totalMinor, 0);
      const customers = new Set(tagged.map((sale) => (sale.customerName || "walk-in").trim().toLowerCase())).size;
      const lastAt = tagged.reduce<string | undefined>((acc, sale) => (acc && acc >= sale.paidAt ? acc : sale.paidAt), undefined);
      return {
        store,
        tickets: tagged.length,
        spendMinor,
        avgMinor: tagged.length ? Math.round(spendMinor / tagged.length) : 0,
        customers,
        lastAt,
      };
    });
    lines.sort((a, b) => b.spendMinor - a.spendMinor);
    const total = lines.reduce((sum, row) => sum + row.spendMinor, 0);
    const totalTickets = lines.reduce((sum, row) => sum + row.tickets, 0);
    return { lines, total, totalTickets };
  }, [stores, sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Store performance</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Store performance</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every store ranked on the money it collects — tickets, average basket, unique customers and the last sale on
            that register.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stores with sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.lines.filter((row) => row.tickets).length}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">of {rows.lines.length} registered or seen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total store sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across the network</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ReceiptText size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Tickets</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.totalTickets.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">rung across all stores</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Store rankings</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Receipts are tagged `storeId`; stores never seen on a receipt are still shown for completeness.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No stores yet — create stores in Setup and tag the till at the register.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Store</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Kind</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Tickets</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Avg basket</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customers</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.store.id} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-pos-ink">
                          <Boxes size={14} className="text-pos-ink-faint" />
                          {row.store.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-pos-ink-muted">
                          {(row.store as HqStore).kind ?? "retail"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets || "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.tickets ? naira(row.avgMinor) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.customers || "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.spendMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums" style={{ color: colors.primary }}>
                        {rows.total > 0 ? `${Math.round((row.spendMinor / rows.total) * 100)}%` : "—"}
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