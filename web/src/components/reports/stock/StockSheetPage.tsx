"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderArchive, Printer } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog } from "@/lib/hq-api";
import { listStockLevels, naira, type StockLevel } from "@/lib/hq-ops";
import { formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../../Skeleton";

export function StockSheetPage() {
  const [levels, setLevels] = useState<StockLevel[] | null>(null);

  useEffect(() => {
    listStockLevels()
      .then(setLevels)
      .catch((err) => {
        toast.error(err, "Could not load stock");
        setLevels([]);
      });
  }, []);

  const groups = useMemo(() => {
    if (!levels) return [];
    const map = new Map<string, StockLevel[]>();
    for (const row of [...levels].sort((a, b) => a.name.localeCompare(b.name))) {
      const key = row.category || "General";
      const rows = map.get(key) ?? [];
      rows.push(row);
      map.set(key, rows);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [levels]);

  if (!levels) return <ManagerSkeleton variant="table" />;

  const totalValue = levels.reduce((sum, row) => sum + row.valueMinor, 0);

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Stock
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Stock sheet</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Full stock listing grouped by category — clean, dense, print-friendly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
        >
          <Printer size={16} /> Print sheet
        </button>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-pos-border bg-pos-surface px-5 py-4 shadow-pos-md text-sm text-pos-ink-muted">
        <FolderArchive size={17} className="text-pos-primary" />
        <span>
          <span className="font-bold text-pos-ink">{groups.length}</span> categories
        </span>
        <span className="mx-1 text-pos-ink-faint">·</span>
        <span>
          <span className="font-bold text-pos-ink">{levels.length}</span> lines
        </span>
        <span className="mx-1 text-pos-ink-faint">·</span>
        <span>
          Total value <span className="font-bold text-pos-ink">{naira(totalValue, 0)}</span>
        </span>
      </div>

      <div className="space-y-5">
        {groups.length === 0 ? (
          <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
            <FolderArchive size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
            <p className="text-sm text-pos-ink-faint">No stock records yet.</p>
          </div>
        ) : (
          groups.map(([category, rows]) => {
            const groupValue = rows.reduce((sum, row) => sum + row.valueMinor, 0);
            return (
              <section
                key={category}
                className="break-inside-avoid overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md"
              >
                <header className="flex items-center justify-between border-b border-pos-border bg-pos-surface-muted/40 px-5 py-3.5">
                  <h2 className="font-semibold text-pos-ink">{category}</h2>
                  <span className="text-xs tabular-nums text-pos-ink-faint">
                    {rows.length} lines · {naira(groupValue, 0)}
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" style={{ minWidth: 640 }}>
                    <thead className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                      <tr>
                        <th className="px-5 py-2.5">Name</th>
                        <th className="px-5 py-2.5">SKU</th>
                        <th className="px-5 py-2.5 text-right">On hand</th>
                        <th className="px-5 py-2.5 text-right">Reorder at</th>
                        <th className="px-5 py-2.5 text-right">Unit value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pos-border/40">
                      {rows.map((row) => (
                        <tr key={row.itemId} className="hover:bg-pos-surface-muted/40">
                          <td className="px-5 py-2.5 font-medium text-pos-ink">{row.name}</td>
                          <td className="px-5 py-2.5 font-mono text-xs text-pos-ink-faint">{row.sku || "—"}</td>
                          <td className={`px-5 py-2.5 text-right whitespace-nowrap ${row.onHand <= row.reorderPoint ? "font-semibold text-pos-warning" : "text-pos-ink"}`}>
                            {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-pos-ink-faint">
                            {row.reorderPoint}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-pos-ink-muted">
                            {naira(row.valueMinor, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}