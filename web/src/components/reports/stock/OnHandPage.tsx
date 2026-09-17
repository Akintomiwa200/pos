"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Package, PackageCheck, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { listStockLevels, naira, type StockLevel } from "@/lib/hq-ops";
import { StockAdjustmentModal } from "@/components/transactions/StockAdjustmentModal";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function OnHandPage() {
  const colors = useThemeColors();
  const { session } = useAuth();
  useOrgLocale();
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [adjustItem, setAdjustItem] = useState<StockLevel | null>(null);

  useEffect(() => {
    listStockLevels().then(setLevels).catch(() => setLevels([]));
  }, []);

  const rows = useMemo(() => {
    if (!levels) return null;
    const inStock = levels.map((row) => ({ ...row })).sort((a, b) => b.valueMinor - a.valueMinor);
    const onHandUnits = inStock.reduce((sum, row) => sum + row.onHand, 0);
    const totalValue = inStock.reduce((sum, row) => sum + row.valueMinor, 0);
    return { rows: inStock, onHandUnits, totalValue, skuCount: inStock.length };
  }, [levels]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Inventory · On hand</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">On-hand inventory</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every product currently in stock — what you physically hold, its reorder level, and its value right now.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Items in stock</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.rows.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">catalogued SKUs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Package size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stock on hand</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.onHandUnits.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">total units</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackageCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stock value</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalValue)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">at current cost/fifo value</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShieldAlert size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Below reorder</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.rows.filter((row) => row.onHand <= row.reorderPoint).length}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">items to restock soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Stock position</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Ordered by current value, highest first.</p>
        </header>
        {rows.rows.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No stock level data yet — add products and receipts.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">SKU</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">On hand</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reorder level</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Value</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.rows.map((row) => {
                    const low = row.onHand <= row.reorderPoint && row.reorderPoint > 0;
                    const out = row.onHand <= 0;
                    return (
                      <tr key={row.itemId} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                        <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{row.sku || "—"}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">
                          {row.onHand.toLocaleString()} {row.unitLabel ?? row.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                          {row.reorderPoint > 0 ? row.reorderPoint.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.valueMinor)}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                              out
                                ? "bg-pos-danger/10 text-pos-danger"
                                : low
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {out ? "Out of stock" : low ? "Low" : "In stock"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setAdjustItem(row)}
                            className="inline-flex items-center gap-1 rounded-full border border-pos-border/70 px-2.5 py-1 text-[11px] font-semibold text-pos-ink-muted transition hover:border-pos-primary/50 hover:bg-pos-primary-soft hover:text-pos-primary"
                          >
                            <SlidersHorizontal size={11} /> Adjust
                          </button>
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

      {adjustItem && (
        <StockAdjustmentModal
          initialReason="Count correction"
          initialItemId={adjustItem.itemId}
          recordedBy={session?.name ?? ""}
          onClose={() => setAdjustItem(null)}
          onSaved={(fresh) => {
            setLevels(fresh);
          }}
        />
      )}
    </div>
  );
}