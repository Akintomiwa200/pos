"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Coins, FlaskConical, Scale } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { listCatalog } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionCostReportPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [catalog, setCatalog] = useState<Array<{ name: string; costMinor: number }>>([]);

  useEffect(() => {
    Promise.all([getProductionBook().catch(() => null), listCatalog().catch(() => [])])
      .then(([b, c]) => {
        setBook(b);
        setCatalog(c);
      })
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const costs = new Map(catalog.map((row) => [row.name.toLowerCase(), row.costMinor]));
    const byProduct = new Map<string, { recipeId?: string; yieldUnits: number; salePriceMinor: number; ingredientCostMinor: number; unpriced: boolean }>();
    for (const recipe of book.recipes) {
      let ingredientCost = 0;
      let unpriced = false;
      for (const ing of recipe.ingredients) {
        const unitCost = costs.get(ing.name.toLowerCase());
        if (unitCost === undefined) {
          unpriced = true;
          continue;
        }
        ingredientCost += Math.round(ing.requiredUnits * (unitCost ?? 0));
      }
      const prev = byProduct.get(recipe.productName);
      byProduct.set(recipe.productName, {
        recipeId: recipe.id,
        yieldUnits: recipe.yieldUnits,
        salePriceMinor: recipe.salePriceMinor,
        ingredientCostMinor: (prev?.ingredientCostMinor ?? 0) + ingredientCost,
        unpriced: (prev?.unpriced ?? false) || unpriced,
      });
    }
    const batchCostByProduct = new Map<string, number[]>();
    for (const batch of book.batches) {
      if (batch.unitCostMinor && batch.unitCostMinor > 0) {
        const arr = batchCostByProduct.get(batch.productName) ?? [];
        arr.push(batch.unitCostMinor);
        batchCostByProduct.set(batch.productName, arr);
      }
    }
    const lines = [...byProduct.entries()].map(([product, recipe]) => {
      const recorded = batchCostByProduct.get(product) ?? [];
      const recordedAvg = recorded.length ? Math.round(recorded.reduce((sum, v) => sum + v, 0) / recorded.length) : 0;
      const costPerUnit = recipe.yieldUnits > 0 ? Math.round(recipe.ingredientCostMinor / recipe.yieldUnits) : 0;
      const marginMinor = recipe.salePriceMinor - (recordedAvg || costPerUnit);
      const marginPct = recipe.salePriceMinor > 0 ? Math.round((marginMinor / recipe.salePriceMinor) * 1000) / 10 : null;
      return { product, recipe, costPerUnit, recordedAvg, marginMinor, marginPct };
    }).sort((a, b) => a.marginPct ?? 0 - (b.marginPct ?? 0));
    return { lines };
  }, [book, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Cost report</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production cost report</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            What each product really costs to make — recipe-standard ingredient cost per unit, against the recorded batch
            costs and the selling price.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><FlaskConical size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Recipes priced</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">products costed here</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Scale size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Costing basis</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">
                  {rows.lines.length ? (rows.lines.some((row) => row.recipe.unpriced) ? "Partial" : "Complete") : "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">some ingredients lack catalogue cost</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BadgePercent size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Best margin</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">
                  {rows.lines.reduce((best, row) => (row.marginPct !== null && row.marginPct > (best ?? -Infinity) ? row.marginPct : best), null as number | null) ?? "—"}
                  {rows.lines.reduce((best, row) => (row.marginPct !== null && row.marginPct > (best ?? -Infinity) ? row.marginPct : best), null as number | null) !== null ? "%" : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">highest margin product</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Cost per product</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Standard cost reads ingredients × catalogue cost; margin prefers recorded batch unit cost when present.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No recipes yet — cost the products you make to see margins here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Yield</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Std cost/unit</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Recorded avg</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Selling price</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.product}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.product}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.recipe.yieldUnits}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">
                        {row.recipe.unpriced ? <span className="text-pos-ink-faint">partial</span> : naira(row.costPerUnit)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {row.recordedAvg ? naira(row.recordedAvg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.recipe.salePriceMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums" style={{ color: row.marginPct !== null && row.marginPct < 0 ? "#ef4444" : colors.primary }}>
                        {row.marginPct !== null ? `${row.marginPct}%` : <span className="text-pos-ink-faint">—</span>}
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