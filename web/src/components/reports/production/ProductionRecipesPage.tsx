"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Boxes, Scale, Soup } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { listCatalog } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionRecipesPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [catalog, setCatalog] = useState<Array<{ name: string; costMinor: number; unit: string }>>([]);

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
    const costs = new Map(catalog.map((row) => [row.name.toLowerCase(), { costMinor: row.costMinor, unit: row.unit }]));
    const recipes = book.recipes
      .map((recipe) => {
        let ingredientCost = 0;
        const ingredients = recipe.ingredients.map((ing) => {
          const meta = costs.get(ing.name.toLowerCase());
          const costMinor = meta ? Math.round(ing.requiredUnits * meta.costMinor) : 0;
          ingredientCost += costMinor;
          return {
            name: ing.name,
            requiredUnits: ing.requiredUnits,
            unit: meta?.unit ?? "x",
            costMinor,
            priced: Boolean(meta),
          };
        });
        const costPerUnit = recipe.yieldUnits > 0 ? Math.round(ingredientCost / recipe.yieldUnits) : 0;
        const marginMinor = recipe.salePriceMinor - costPerUnit;
        const marginPct = recipe.salePriceMinor > 0 && costPerUnit > 0 ? Math.round((marginMinor / recipe.salePriceMinor) * 1000) / 10 : null;
        const madeUnits = book.batches
          .filter((batch) => batch.productName.toLowerCase() === recipe.productName.toLowerCase())
          .reduce((sum, batch) => sum + batch.producedUnits, 0);
        return { recipe, ingredients, ingredientCost, costPerUnit, marginMinor, marginPct, madeUnits, unpriced: !ingredients.every((row) => row.priced) };
      })
      .sort((a, b) => a.recipe.productName.localeCompare(b.recipe.productName));
    return { recipes };
  }, [book, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Recipes</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Recipes</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The bill of materials behind every product — ingredient quantities, standard cost to fill a batch, and the
            margin at the selling price.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Soup size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Recipes on file</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.recipes.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">products with a bill of materials</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Whole-batch costs</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight text-white">{naira(rows.recipes.reduce((sum, row) => sum + row.ingredientCost, 0))}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across all recipes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Scale size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Priced ingredients</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">
                  {rows.recipes.length ? `${rows.recipes.filter((row) => !row.unpriced).length}/${rows.recipes.length} complete` : "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">all ingredients found in catalogue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-4">
        {rows.recipes.length === 0 ? (
          <article className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border bg-pos-surface text-sm text-pos-ink-faint">
            No recipes recorded — add one from the Production workbook.
          </article>
        ) : (
          rows.recipes.map((row) => (
            <article key={row.recipe.id} className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-pos-ink">{row.recipe.productName}</h2>
                  <p className="mt-0.5 text-sm text-pos-ink-muted">
                    Yield {row.recipe.yieldUnits} units {row.madeUnits ? `· ${row.madeUnits.toLocaleString()} made` : ""}{" "}
                    {row.unpriced ? "· some ingredients unpriced" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Batch cost</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: colors.primary }}>{naira(row.ingredientCost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Margin</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: row.marginPct !== null && row.marginPct < 0 ? "#ef4444" : "#10b981" }}>
                    {row.marginPct !== null ? `${row.marginPct}%` : "—"}
                  </p>
                  <p className="text-[11px] text-pos-ink-muted">{naira(row.recipe.salePriceMinor)} / unit</p>
                </div>
              </header>
              <div className="mt-4 overflow-hidden rounded-2xl border border-pos-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse">
                    <thead>
                      <tr className="border-b border-pos-border bg-pos-surface-muted">
                        <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Ingredient</th>
                        <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Quantity</th>
                        <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pos-border/60">
                      {row.ingredients.map((ing) => (
                        <tr key={ing.name}>
                          <td className="px-4 py-2.5 text-[13px] font-medium text-pos-ink">{ing.name}</td>
                          <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-pos-ink-muted">
                            {ing.requiredUnits.toLocaleString()} {ing.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-pos-ink">{ing.priced ? naira(ing.costMinor) : "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-pos-surface-muted/60">
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-pos-ink">Std cost per unit</td>
                        <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.recipe.yieldUnits}</td>
                        <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                          {naira(row.costPerUnit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}