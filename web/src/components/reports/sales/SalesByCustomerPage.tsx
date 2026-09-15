"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, ShoppingBag, Store, UserRound } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira, prettyDay } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

type CustomerRow = {
  name: string;
  tickets: number;
  units: number;
  totalMinor: number;
  lastAt: string;
  firstAt: string;
  loyalty: boolean;
};

export function SalesByCustomerPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales().then(setSales).catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const map = new Map<string, CustomerRow>();
    for (const sale of sales) {
      const name = sale.customerName?.trim() || "Walk-in";
      const row = map.get(name) ?? {
        name,
        tickets: 0,
        units: 0,
        totalMinor: 0,
        lastAt: sale.paidAt,
        firstAt: sale.paidAt,
        loyalty: Boolean(sale.loyaltyNumber),
      };
      row.tickets += 1;
      row.units += (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
      row.totalMinor += sale.totalMinor;
      if (sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      if (sale.paidAt < row.firstAt) row.firstAt = sale.paidAt;
      if (sale.loyaltyNumber) row.loyalty = true;
      map.set(name, row);
    }
    const all = [...map.values()].sort((a, b) => b.totalMinor - a.totalMinor);
    const grand = all.reduce((sum, row) => sum + row.totalMinor, 0);
    const walkIn = all.filter((row) => row.name === "Walk-in");
    const tracked = all.filter((row) => row.name !== "Walk-in");
    return { all, grand, walkIn, tracked };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const top = rows.all.filter((row) => row.name !== "Walk-in").at(0);

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · By customer</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sales by customer</h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                Every customer ranked by what they have bought — including walk-ins — with loyalty and recency.
              </p>
            </div>
            {top ? (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <Crown size={15} />
                Top: {top.name} · {naira(top.totalMinor)}
              </div>
            ) : null}
          </div>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UserRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Customers</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.tracked.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">plus {rows.walkIn.length === 0 ? 0 : 1} walk-in bucket</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShoppingBag size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Repeat buyer share</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.tracked.filter((row) => row.tickets > 1).length} customers
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">{naira(rows.grand)} across all customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Top customers</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Ranked by total sales this period</p>
          </header>
          <ol className="mt-4 divide-y divide-pos-border/60">
            {rows.tracked.slice(0, 6).map((row, index) => (
              <li key={row.name} className="flex items-center gap-3 py-3">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    index === 0 ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-pos-ink">{row.name}</span>
                  <span className="text-[11px] text-pos-ink-faint">
                    {row.tickets} purchases · last {prettyDay(row.lastAt).replace(",", "")}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</span>
              </li>
            ))}
            {rows.tracked.length === 0 ? (
              <li className="py-10 text-center text-sm text-pos-ink-faint">No named customers yet.</li>
            ) : null}
          </ol>
        </article>

        <article className="lg:col-span-2 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4">
            <h2 className="font-semibold text-pos-ink">All customers</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">
              {rows.all.length} rows · loyalty mark shows a loyalty number was attached to a sale
            </p>
          </header>
          {rows.all.length === 0 ? (
            <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
              No sales recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-pos-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr className="border-b border-pos-border bg-pos-surface-muted">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                      <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Loyalty</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Purchases</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Units</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Last purchase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/60">
                    {rows.all.map((row) => (
                      <tr key={row.name} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                        <td className="px-4 py-3 text-center">
                          {row.loyalty ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
                              <Store size={11} /> member
                            </span>
                          ) : (
                            <span className="text-xs text-pos-ink-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{prettyDay(row.lastAt)}</td>
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