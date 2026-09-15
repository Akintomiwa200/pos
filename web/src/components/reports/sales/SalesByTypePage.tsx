"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Layers3, ReceiptText, ShoppingBag, Wallet } from "lucide-react";
import { listCatalog, listSales, type HqCatalogItem, type HqSale } from "@/lib/hq-api";
import { naira, prettyDay, dayKey } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const SERVICE_UNITS = new Set([
  "service",
  "services",
  "consultation",
  "consult",
  "hour",
  "hours",
  "hr",
  "hrs",
  "day",
  "night",
  "treatment",
  "session",
  "monthly",
  "maintenance",
  "sitting",
  "cover",
]);

function unitOf(item: HqCatalogItem | undefined) {
  return (item?.unit ?? item?.unitLabel ?? "").toLowerCase().trim();
}

export function SalesByTypePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows, items]) => {
        setSales(rows);
        setCatalog(items);
      })
      .catch(() => {
        setSales([]);
        setCatalog([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !catalog) return null;
    const itemOf = new Map(catalog.map((item) => [item.id, item]));
    const buckets = new Map<string, { label: string; units: number; tickets: number; grossMinor: number }>();
    for (const sale of sales) {
      for (const line of sale.lines ?? []) {
        const item = itemOf.get(line.itemId ?? "");
        const isService = item ? SERVICE_UNITS.has(unitOf(item)) : false;
        const key = isService ? "service" : "product";
        const row = buckets.get(key) ?? { label: isService ? "Services" : "Products", units: 0, tickets: 0, grossMinor: 0 };
        row.units += line.quantity;
        row.grossMinor += line.quantity * line.unitPriceMinor;
        row.tickets += 1;
        buckets.set(key, row);
      }
    }
    const product = buckets.get("product") ?? { label: "Products", units: 0, tickets: 0, grossMinor: 0 };
    const service = buckets.get("service") ?? { label: "Services", units: 0, tickets: 0, grossMinor: 0 };
    const directSaleCount = sales.filter((s) => !s.tillKey && (s.customerName || s.customerPhone) && !(s.lines ?? []).length).length;
    const directSaleMinor = sales
      .filter((s) => !s.tillKey && (s.customerName || s.customerPhone) && !(s.lines ?? []).length)
      .reduce((sum, s) => sum + s.totalMinor, 0);
    const grand = product.grossMinor + service.grossMinor + directSaleMinor;
    return { product, service, directSaleCount, directSaleMinor, grand };
  }, [sales, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const types = [
    {
      id: "product",
      label: rows.product.label,
      tickets: rows.product.tickets,
      units: rows.product.units,
      grossMinor: rows.product.grossMinor,
    },
    {
      id: "service",
      label: rows.service.label,
      tickets: rows.service.tickets,
      units: rows.service.units,
      grossMinor: rows.service.grossMinor,
    },
    { id: "direct", label: "Direct payments", units: 0, tickets: rows.directSaleCount, grossMinor: rows.directSaleMinor },
  ];

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · By type</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sales by type</h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                Sales split between physical products, service lines, and direct payments — computed line by line
                from every sale.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              <Layers3 size={15} />
              {naira(rows.grand)} total
            </div>
          </div>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            {types.map((row) => (
              <div key={row.id} className="flex items-start gap-3">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"
                >
                  {row.id === "product" ? <Boxes size={20} /> : row.id === "service" ? <ReceiptText size={20} /> : <Wallet size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">{row.label}</p>
                  <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(row.grossMinor)}</p>
                  <p className="mt-0.5 truncate text-xs text-white/60">
                    {row.units.toLocaleString()} units · {row.tickets} sales
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Breakdown</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Products <span className="text-pos-ink-faint">(sellable catalog items)</span> · Services{" "}
            <span className="text-pos-ink-faint">(lines on service-style units)</span> · Direct payments{" "}
            <span className="text-pos-ink-faint">(customer receipts without product lines)</span>
          </p>
        </header>
        {types.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No sales recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Type</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Units</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {types.map((row) => {
                    const share = rows.grand ? Math.round((row.grossMinor / rows.grand) * 100) : 0;
                    return (
                      <tr key={row.id} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.label}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.grossMinor)}</td>
                        <td className="px-4 py-3">
                          <div className="ml-auto flex max-w-[180px] items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                              <span className="block h-full rounded-full bg-pos-primary" style={{ width: `${share}%` }} />
                            </span>
                            <span className="w-9 text-right text-[11px] tabular-nums text-pos-ink-faint">{share}%</span>
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