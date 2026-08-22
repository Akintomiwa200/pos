"use client";

import { useEffect, useMemo, useState } from "react";
import { listCatalog, listSales, type HqCatalogItem, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

export type GrossProfitVariant = "by-group" | "by-subgroup" | "by-item";

const HEADERS: Record<GrossProfitVariant, { kicker: string; title: string; copy: string }> = {
  "by-group": {
    kicker: "Report · Sales · Gross Profit",
    title: "By Group",
    copy: "Gross profit per category using item cost prices from the catalog.",
  },
  "by-subgroup": {
    kicker: "Report · Sales · Gross Profit",
    title: "By Subgroup",
    copy: "Gross profit by product subcategory from the catalog.",
  },
  "by-item": {
    kicker: "Report · Sales · Gross Profit",
    title: "By Item",
    copy: "Gross profit per item using catalog cost and selling prices.",
  },
};

type Row = {
  key: string;
  units: number;
  revenueMinor: number;
  costMinor: number;
};

function collect(
  sales: HqSale[],
  catalog: HqCatalogItem[],
  variant: GrossProfitVariant,
): Row[] {
  const byId = new Map(catalog.map((item) => [item.id, item] as const));
  const byName = new Map(catalog.map((item) => [item.name.toLowerCase(), item] as const));
  const map = new Map<string, Row>();

  const bump = (key: string, units: number, revenueMinor: number, costMinor: number) => {
    if (!key || revenueMinor <= 0) return;
    const row = map.get(key) ?? { key, units: 0, revenueMinor: 0, costMinor: 0 };
    row.units += units;
    row.revenueMinor += revenueMinor;
    row.costMinor += costMinor;
    map.set(key, row);
  };

  for (const sale of sales) {
    for (const line of sale.lines ?? []) {
      const revenue = line.unitPriceMinor * line.quantity;
      const item =
        (line.itemId ? byId.get(line.itemId) : undefined) ??
        byName.get(line.name.toLowerCase());
      const unitCost = item?.costMinor && item.costMinor > 0 ? item.costMinor : 0;
      const cost = unitCost * line.quantity;

      if (variant === "by-item") {
        bump(line.name, line.quantity, revenue, cost);
      } else if (variant === "by-group") {
        bump(item?.category ?? "General", line.quantity, revenue, cost);
      } else {
        bump(
          item?.subcategory?.trim() || item?.category || line.name.trim().split(/\s+/)[0] || line.name,
          line.quantity,
          revenue,
          cost,
        );
      }
    }
  }

  return [...map.values()].sort((a, b) => b.revenueMinor - a.revenueMinor);
}

export function GrossProfitReport({ variant }: { variant: GrossProfitVariant }) {
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()]).then(([rows, items]) => {
      setSales(rows);
      setCatalog(items);
    });
  }, []);

  const header = HEADERS[variant];
  const rows = useMemo(
    () => (sales ? collect(sales, catalog, variant) : []),
    [sales, catalog, variant],
  );

  if (!sales) return <ManagerSkeleton variant="table" />;

  const revenue = rows.reduce((sum, row) => sum + row.revenueMinor, 0);
  const cogs = rows.reduce((sum, row) => sum + row.costMinor, 0);
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

  return (
    <div>
      <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label="Revenue" value={naira(revenue)} />
        <StatCard label="Cost of goods" value={naira(cogs)} />
        <StatCard label="Gross profit" value={naira(grossProfit)} hint={`${margin}% margin`} />
        <StatCard label={variant === "by-item" ? "Items sold" : "Buckets"} value={String(rows.length)} />
      </div>
      <TableShell columns={["Name", "Units", "Revenue", "COGS", "Gross profit"]}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} message="No sales recorded yet." />
        ) : (
          rows.map((row) => (
            <tr key={row.key} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{row.key}</td>
              <td className="px-4 py-3">{row.units.toLocaleString()}</td>
              <td className="px-4 py-3">{naira(row.revenueMinor)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{naira(row.costMinor)}</td>
              <td className="px-4 py-3 text-pos-success">
                {naira(row.revenueMinor - row.costMinor)}
              </td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
