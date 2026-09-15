"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Coins, FlaskConical, ReceiptText } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { listCatalog } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionBatchCostsPage() {
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
    const recipeFor = new Map(book.recipes.map((recipe) => [
      recipe.productName.toLowerCase(),
      {
        yieldUnits: recipe.yieldUnits,
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          requiredUnits: ing.requiredUnits,
          unitCostMinor: costs.get(ing.name.toLowerCase()) ?? 0,
        })),
      },
    ]));
    const batches = book.batches
      .map((batch) => {
        const recipe = recipeFor.get(batch.productName.toLowerCase());
        const standardMinor = recipe
          ? Math.round(
              recipe.ingredients.reduce((sum, ing) => sum + ing.requiredUnits * ing.unitCostMinor, 0) *
                (batch.plannedUnits / Math.max(1, recipe.yieldUnits)),
            )
          : 0;
        const recordedMinor = batch.unitCostMinor ? batch.unitCostMinor * batch.producedUnits : 0;
        const baseMinor = recordedMinor || standardMinor;
        const spreadWaste = book.waste
          .filter((w) => w.batchId === batch.id)
          .reduce((sum, w) => sum + w.quantity * w.unitCostMinor, 0);
        const totalMinor = baseMinor + spreadWaste;
        return {
          ...batch,
          standardMinor,
          recordedMinor,
          spreadWaste,
          totalMinor,
          unitMinor: batch.producedUnits > 0 ? Math.round(totalMinor / batch.producedUnits) : 0,
          unpriced: recipe?.ingredients.some((ing) => ing.unitCostMinor <= 0) ?? false,
        };
      })
      .sort((a, b) => b.totalMinor - a.totalMinor);
    const totalStandard = batches.reduce((sum, row) => sum + row.standardMinor, 0);
    const totalRecorded = batches.reduce((sum, row) => sum + row.recordedMinor, 0);
    const totalWaste = batches.reduce((sum, row) => sum + row.spreadWaste, 0);
    return { batches, totalStandard, totalRecorded, totalWaste };
  }, [book, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Batch costs</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Batch costs</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every batch priced out — recipe-standard cost scaled to plan, recorded unit cost where entered, and waste
            assigned back to the batch that caused it.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Calculator size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Standard input cost</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalStandard)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">recipe × plan, at catalogue cost</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ReceiptText size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Recorded cost</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalRecorded)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">from batch unit costs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Coins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Waste on batches</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalWaste)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">linked to their batch</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Cost per batch</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Standard needs a matching recipe; recorded needs a unit cost on the batch. Unpriced ingredients are counted at zero.
          </p>
        </header>
        {rows.batches.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No batches to cost yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batch</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Standard</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Recorded</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Waste</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Total</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.batches.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{row.number}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.productName}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.producedUnits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.standardMinor ? naira(row.standardMinor) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.recordedMinor ? naira(row.recordedMinor) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-red-500">{row.spreadWaste ? naira(row.spreadWaste) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                        {naira(row.totalMinor)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.unitMinor ? naira(row.unitMinor) : "—"}</td>
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