"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FolderArchive, Printer, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { listStockLevels, naira, type StockLevel } from "@/lib/hq-ops";
import { formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../../Skeleton";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StockSheetPage() {
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listStockLevels()
      .then(setLevels)
      .catch((err) => {
        toast.error(err, "Could not load stock");
        setLevels([]);
      });
  }, []);

  const query = search.trim().toLowerCase();

  const filteredLevels = useMemo(() => {
    if (!levels) return [];
    if (!query) return levels;
    return levels.filter((row) =>
      [row.name, row.sku, row.barcode, row.category].some((v) =>
        v.toLowerCase().includes(query),
      ),
    );
  }, [levels, query]);

  const groups = useMemo(() => {
    const map = new Map<string, StockLevel[]>();
    for (const row of [...filteredLevels].sort((a, b) => a.name.localeCompare(b.name))) {
      const key = row.category || "General";
      const rows = map.get(key) ?? [];
      rows.push(row);
      map.set(key, rows);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredLevels]);

  if (!levels) return <ManagerSkeleton variant="table" />;

  const totalValue = filteredLevels.reduce((sum, row) => sum + row.valueMinor, 0);

  const exportStockCsv = () => {
    const headers = ["Category", "Name", "SKU", "Barcode", "On Hand", "Unit", "Reorder Level", "Total Value (Minor)"];
    const rows = filteredLevels.map((l) => [
      `"${(l.category || "General").replace(/"/g, '""')}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.sku || ""}"`,
      `"${l.barcode || ""}"`,
      l.onHand,
      `"${l.unitLabel || l.unit}"`,
      l.reorderPoint,
      l.valueMinor,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(`stock-sheet-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success("Stock sheet exported as CSV");
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-pos-border/70 pb-5 print:hidden">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Inventory Valuation
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-pos-ink">Physical Stock Sheet</h1>
          <p className="mt-1 text-xs text-pos-ink-muted">
            Complete inventory listing categorized for physical audits, valuations, and warehouse floor checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportStockCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-4 py-2 text-xs font-semibold text-pos-ink shadow-pos-sm hover:bg-pos-surface-muted"
          >
            <Download size={14} className="text-pos-primary" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pos-primary px-4 py-2 text-xs font-semibold text-white shadow-pos-primary transition hover:opacity-95"
          >
            <Printer size={14} />
            <span>Print Sheet</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Categories</p>
          <p className="mt-1 text-xl font-bold text-pos-ink tabular-nums">{groups.length}</p>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Products Listed</p>
          <p className="mt-1 text-xl font-bold text-pos-ink tabular-nums">{filteredLevels.length}</p>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Inventory Valuation</p>
          <p className="mt-1 text-xl font-bold text-pos-ink tabular-nums">{naira(totalValue, 0)}</p>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Below Reorder Level</p>
          <p className="mt-1 text-xl font-bold text-pos-warning tabular-nums">
            {filteredLevels.filter((l) => l.onHand <= l.reorderPoint).length}
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md print:hidden">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
        <input
          type="text"
          placeholder="Filter sheet by product name, SKU, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-pos-border bg-pos-surface-muted/60 py-2 pl-9 pr-3 text-xs text-pos-ink placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
        />
      </div>

      {/* Categorized Stock Tables */}
      <div className="space-y-6">
        {groups.length === 0 ? (
          <div className="rounded-[24px] border border-pos-border bg-pos-surface py-16 text-center shadow-pos-sm">
            <FolderArchive size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
            <p className="text-xs font-medium text-pos-ink">No stock items match your search filter.</p>
          </div>
        ) : (
          groups.map(([category, rows]) => {
            const groupValue = rows.reduce((sum, row) => sum + row.valueMinor, 0);
            return (
              <section
                key={category}
                className="break-inside-avoid overflow-hidden rounded-[24px] border border-pos-border/80 bg-pos-surface shadow-pos-sm"
              >
                <header className="flex items-center justify-between border-b border-pos-border bg-pos-surface-muted/50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-pos-ink">{category}</h2>
                    <span className="rounded-full bg-pos-surface px-2 py-0.5 text-[10px] font-semibold text-pos-ink-muted">
                      {rows.length} items
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-pos-ink tabular-nums">
                    {naira(groupValue, 0)}
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="border-b border-pos-border text-[10px] font-semibold uppercase tracking-wider text-pos-ink-faint">
                      <tr>
                        <th className="px-5 py-2.5">Product Name</th>
                        <th className="px-5 py-2.5">SKU / Barcode</th>
                        <th className="px-5 py-2.5 text-right">Physical On Hand</th>
                        <th className="px-5 py-2.5 text-right">Reorder Threshold</th>
                        <th className="px-5 py-2.5 text-right">Category Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pos-border/40">
                      {rows.map((row) => {
                        const isLow = row.onHand <= row.reorderPoint;
                        return (
                          <tr key={row.itemId} className="transition hover:bg-pos-surface-muted/30">
                            <td className="px-5 py-2.5 font-medium text-pos-ink">{row.name}</td>
                            <td className="px-5 py-2.5 font-mono text-[11px] text-pos-ink-muted">
                              <div>{row.sku || <span className="text-pos-ink-faint">—</span>}</div>
                              {row.barcode && (
                                <div className="text-[10px] text-pos-ink-faint">{row.barcode}</div>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right whitespace-nowrap tabular-nums">
                              <span className={isLow ? "font-bold text-pos-warning" : "text-pos-ink font-semibold"}>
                                {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)}
                              </span>
                              {isLow && (
                                <span className="ml-1.5 rounded bg-pos-warning/15 px-1 py-0.5 text-[9px] font-bold uppercase text-pos-warning">
                                  Low
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-pos-ink-faint">
                              {row.reorderPoint}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-pos-ink-muted font-medium">
                              {naira(row.valueMinor, 0)}
                            </td>
                          </tr>
                        );
                      })}
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
