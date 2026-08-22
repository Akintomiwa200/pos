"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { naira, listStockLevels, type StockLevel } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

export function ProcurementDashboard() {
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listStockLevels()
      .then(setLevels)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load stock");
        setLevels([]);
      });
  }, []);

  const low = useMemo(() => {
    if (!levels) return [];
    const query = search.trim().toLowerCase();
    return levels
      .filter((level) => level.onHand <= level.reorderPoint)
      .filter((level) =>
        query
          ? [level.name, level.sku].some((value) => value.toLowerCase().includes(query))
          : true,
      );
  }, [levels, search]);

  if (!levels) return <ManagerSkeleton variant="table" />;

  const reorderValueMinor = low.reduce((sum, row) => sum + Math.max(row.reorderPoint * 2 - row.onHand, 0) * (row.valueMinor / Math.max(row.onHand, 1)), 0);

  return (
    <div>
      <PageHeader
        kicker="Procurement"
        title="Reorder Desk"
        copy="Items at or below their reorder point — raise purchase orders before the shelf runs dry."
        action={
          <Link
            href="/transactions/purchase/order/list"
            className="flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ShoppingCart size={15} /> New purchase order
          </Link>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Tracked items" value={String(levels.length)} />
        <StatCard
          label="Below reorder point"
          value={String(low.length)}
          hint={low.length ? "Raise POs soon" : "All good"}
        />
        <StatCard label="Est. restock cost" value={naira(Math.round(reorderValueMinor))} hint="Top-up to 2× reorder point" />
      </div>
      <TableShell
        columns={["Item", "SKU", "Category", "On hand", "Reorder at", "Suggested qty", "Stock value"]}
        minWidth={760}
      >
        {low.length === 0 ? (
          <EmptyRow colSpan={7} message="Nothing to reorder right now." />
        ) : (
          low.map((row) => (
            <tr key={row.itemId} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
              <td className="px-4 py-3">{row.category}</td>
              <td className="px-4 py-3 font-semibold text-pos-danger">{row.onHand}</td>
              <td className="px-4 py-3">{row.reorderPoint}</td>
              <td className="px-4 py-3">{Math.max(row.reorderPoint * 2 - row.onHand, 1)}</td>
              <td className="px-4 py-3">{naira(row.valueMinor)}</td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
