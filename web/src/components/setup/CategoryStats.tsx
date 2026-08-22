"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { listCatalog } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { SetupHeader, DataTable } from "./SetupChrome";

export function CategoryStats() {
  const [items, setItems] = useState<Array<{ category: string; priceMinor: number; onHand: number }> | null>(null);

  useEffect(() => {
    listCatalog()
      .then((rows) =>
        setItems(rows.map((row) => ({ category: row.category, priceMinor: row.priceMinor, onHand: row.onHand }))),
      )
      .catch((err) => {
        toast.error(err, "Could not load catalog");
        setItems([]);
      });
  }, []);

  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, { items: number; units: number; valueMinor: number }>();
    for (const item of items) {
      const row = map.get(item.category) ?? { items: 0, units: 0, valueMinor: 0 };
      row.items += 1;
      row.units += item.onHand;
      row.valueMinor += item.onHand * item.priceMinor;
      map.set(item.category, row);
    }
    return [...map.entries()]
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.valueMinor - a.valueMinor);
  }, [items]);

  if (!items) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        kicker="Setup · Items · Groups"
        title="Groups"
        copy="Groups are the catalog categories. They are created automatically when you save an item with a new category."
        action={
          <Link
            href="/setup/items/items"
            className="rounded-xl bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Manage items
          </Link>
        }
      />
      <DataTable columns={["Group", "Items", "Units in stock", "Stock value"]}>
        {groups.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={4}>
              No groups yet.
            </td>
          </tr>
        ) : (
          groups.map((group) => (
            <tr key={group.category} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{group.category}</td>
              <td className="px-4 py-3">{group.items}</td>
              <td className="px-4 py-3">{group.units}</td>
              <td className="px-4 py-3">{naira(group.valueMinor, 0)}</td>
            </tr>
          ))
        )}
      </DataTable>
    </div>
  );
}
