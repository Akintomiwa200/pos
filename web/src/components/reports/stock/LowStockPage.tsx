"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, PackageX, ShoppingCart } from "lucide-react";
import { listStockLevels, naira, type StockLevel } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function LowStockPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [levels, setLevels] = useState<StockLevel[] | null>(null);

  useEffect(() => {
    listStockLevels(true).then(setLevels).catch(() => setLevels([]));
  }, []);

  const rows = useMemo(() => {
    if (!levels) return null;
    const low = levels
      .map((row) => ({ ...row, shortage: Math.max(0, row.reorderPoint - row.onHand) }))
      .sort((a, b) => b.shortage - a.shortage || a.onHand - b.onHand);
    const out = low.filter((row) => row.onHand <= 0);
    const sho = low.filter((row) => row.onHand > 0);
    return { rows: low, out, sho };
  }, [levels]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Inventory · Low stock</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Low inventory</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Products sitting at or below their reorder level — the restock list, ranked by how much you are short.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><AlertTriangle size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Below reorder</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.rows.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">items flagged low</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackageX size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Out of stock</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.out.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">zero on hand</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Restock list</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Shortage = reorder level − current on hand. Start a purchase from the Purchases menu.
          </p>
        </header>
        {rows.rows.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing below reorder level right now. Nice.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">On hand</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reorder level</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Shortage</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Value</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.rows.map((row) => (
                    <tr key={row.itemId} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">
                        {row.onHand.toLocaleString()} {row.unitLabel ?? row.unit ?? ""}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.reorderPoint}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-pos-danger">{row.shortage}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.valueMinor)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${row.onHand <= 0 ? "bg-pos-danger" : "bg-amber-500"}`}
                          />
                          <span className="text-[12px] text-pos-ink-muted capitalize">
                            {row.onHand <= 0 ? "Out of stock" : row.shortage > 0 ? "Low" : "At reorder"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}