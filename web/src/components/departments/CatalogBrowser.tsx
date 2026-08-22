"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell, Toolbar } from "../console/Chrome";

export function CatalogBrowser() {
  const [items, setItems] = useState<HqCatalogItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load catalog");
        setItems([]);
      });
  }, []);

  const categories = useMemo(
    () => [...new Set((items ?? []).map((item) => item.category).filter(Boolean))].sort(),
    [items],
  );

  const rows = useMemo(() => {
    if (!items) return [];
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => (category ? item.category === category : true))
      .filter((item) =>
        query
          ? [item.name, item.sku, item.barcode].some(
              (value) => typeof value === "string" && value.toLowerCase().includes(query),
            )
          : true,
      );
  }, [items, search, category]);

  if (!items) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <PageHeader
        kicker="Catalog"
        title="Item Browser"
        copy="Every product pushed to the tills — edit under Setup → Items."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Items" value={items.length.toLocaleString()} />
        <StatCard label="Categories" value={String(categories.length)} />
        <StatCard label="Showing" value={`${rows.length}`} hint={category || "All categories"} />
      </div>
      <TableShell
        columns={["Item", "SKU", "Category", "Price", "Stock"]}
        toolbar={
          <Toolbar search={search} onSearch={setSearch} />
        }
        minWidth={680}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} message="No items match." />
        ) : (
          rows.slice(0, 200).map((item) => (
            <tr key={item.id} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{item.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
              <td className="px-4 py-3">{item.category}</td>
              <td className="px-4 py-3 font-semibold">{naira(item.priceMinor)}</td>
              <td className={`px-4 py-3 ${(item.onHand ?? 0) <= 0 ? "text-pos-danger" : ""}`}>
                {item.onHand ?? 0}
              </td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
