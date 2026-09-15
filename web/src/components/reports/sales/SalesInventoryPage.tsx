"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, PackageOpen, TrendingUp } from "lucide-react";
import { listCatalog, listSales, type HqCatalogItem, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function SalesInventoryPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([s, c]) => {
        setSales(s);
        setCatalog(c);
      })
      .catch(() => {
        setSales([]);
        setCatalog([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !catalog) return null;
    const itemOf = new Map(catalog.map((item) => [item.id, item]));
    const map = new Map<string, {
      itemId: string;
      name: string;
      category: string;
      units: number;
      revenueMinor: number;
      costMinor: number;
    }>();
    for (const sale of sales) {
      for (const line of sale.lines ?? []) {
        const item = itemOf.get(line.itemId ?? "");
        const key = item?.id ?? line.name;
        const row = map.get(key) ?? {
          itemId: item?.id ?? "",
          name: line.name,
          category: item?.category ?? "General",
          units: 0,
          revenueMinor: 0,
          costMinor: 0,
        };
        const qty = line.quantity;
        row.units += qty;
        row.revenueMinor += qty * line.unitPriceMinor;
        if (item) row.costMinor += qty * (item.costMinor || 0);
        map.set(key, row);
      }
    }
    const all = [...map.values()].sort((a, b) => b.revenueMinor - a.revenueMinor);
    const totalRevenue = all.reduce((sum, row) => sum + row.revenueMinor, 0);
    const totalCost = all.reduce((sum, row) => sum + row.costMinor, 0);
    const totalUnits = all.reduce((sum, row) => sum + row.units, 0);
    return { all, totalRevenue, totalCost, totalUnits, margin: (totalRevenue - totalCost) }; 
  }, [sales, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · Sales inventory</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sales inventory</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Product-level sales quantities and amounts pulled straight from sales lines — what moved, how many, and
            at what revenue and cost.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Products sold</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.all.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.totalUnits.toLocaleString()} units sold</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackageOpen size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Revenue</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalRevenue)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{naira(rows.totalCost)} cost of sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TrendingUp size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Sales contribution</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.margin)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">before charges and tax</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Product-level sales</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Cost-of-sales uses the current catalog cost; uncatalogued lines show revenue with a — margin.
          </p>
        </header>
        {rows.all.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No sales recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Category</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sold</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Revenue</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Cost</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Contribution</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.all.map((row, index) => {
                    const share = rows.totalRevenue ? Math.round((row.revenueMinor / rows.totalRevenue) * 100) : 0;
                    return (
                      <tr key={row.itemId || row.name} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink-muted">{row.category}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.revenueMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.costMinor ? naira(row.costMinor) : "—"}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink-muted">
                          {row.costMinor ? naira(row.revenueMinor - row.costMinor) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="ml-auto flex max-w-[160px] items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                              <span className="block h-full rounded-full" style={{ width: `${share}%`, background: colors.primary }} />
                            </span>
                            <span className="w-8 text-right text-[11px] tabular-nums text-pos-ink-faint">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}