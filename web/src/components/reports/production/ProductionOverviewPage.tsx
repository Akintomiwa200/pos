"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, FlaskConical, Gauge, Trash2, TriangleAlert } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { listCatalog } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionOverviewPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; costMinor?: number }>>([]);

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
    const costs = new Map(catalog.map((row) => [row.name.toLowerCase(), row.costMinor ?? 0]));
    const efficient = book.batches.filter((row) => row.status === "completed");
    const plannedUnits = book.batches.reduce((sum, row) => sum + row.plannedUnits, 0);
    const producedUnits = book.batches.reduce((sum, row) => sum + row.producedUnits, 0);
    const wasteMinor = book.waste.reduce((sum, row) => sum + row.quantity * row.unitCostMinor, 0);

    const dayKey = (iso: string) => iso.slice(0, 10);
    const byDay = new Map<string, { produced: number; planned: number }>();
    for (const batch of book.batches) {
      const row = byDay.get(dayKey(batch.startedAt)) ?? { produced: 0, planned: 0 };
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      byDay.set(dayKey(batch.startedAt), row);
    }
    const days = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, row]) => ({ day, ...row }));

    const byProduct = new Map<string, { planned: number; produced: number; batches: number }>();
    for (const batch of book.batches) {
      const row = byProduct.get(batch.productName) ?? { planned: 0, produced: 0, batches: 0 };
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      row.batches += 1;
      byProduct.set(batch.productName, row);
    }
    const products = [...byProduct.entries()]
      .map(([name, row]) => ({ name, ...row, pct: row.planned ? Math.round((row.produced / row.planned) * 1000) / 10 : 0 }))
      .sort((a, b) => b.produced - a.produced);

    const recipe = new Map(book.recipes.map((row) => [
      row.productName.toLowerCase(),
      row.ingredients.reduce((sum, ing) => sum + Math.round(ing.requiredUnits * (costs.get(ing.name.toLowerCase()) ?? 0)), 0),
    ]));
    const productLines = products.map((row) => {
      const recipeCost = recipe.get(row.name.toLowerCase());
      const fromBatches = book.batches
        .filter((batch) => batch.productName.toLowerCase() === row.name.toLowerCase() && batch.unitCostMinor)
        .reduce((sum, batch) => sum + (batch.unitCostMinor ?? 0), 0) / Math.max(1, book.batches.filter((batch) => batch.productName.toLowerCase() === row.name.toLowerCase() && batch.unitCostMinor).length);
      return { ...row, recipeCost: recipeCost ?? 0, batchCost: fromBatches || 0 };
    });

    return {
      batches: book.batches.length,
      efficient: efficient.length,
      efficiency: plannedUnits > 0 ? Math.round((producedUnits / plannedUnits) * 1000) / 10 : null,
      plannedUnits,
      producedUnits,
      wasteMinor,
      deviations: book.deviations.length,
      days,
      products: productLines,
      ingredientsUnpriced: book.recipes.some((row) =>
        row.ingredients.some((ing) => (costs.get(ing.name.toLowerCase()) ?? 0) <= 0),
      ),
    };
  }, [book, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Overview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production overview</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The whole floor on one page — batches run, units yielded against plan, waste written off and deviations
            flagged for the next huddle.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><FlaskConical size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Batches run</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.batches}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.efficient} completed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Gauge size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Yield vs plan</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.producedUnits.toLocaleString()} / {rows.plannedUnits.toLocaleString()}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  {rows.efficiency !== null ? `${rows.efficiency}% efficiency` : "no batches yet"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TriangleAlert size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Waste + deviations</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {naira(rows.wasteMinor)}{rows.deviations ? ` · ${rows.deviations}` : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">value written off and logged issues</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Recent daily production</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Units planned and produced per day, oldest 14 days at a glance.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.days.map((row) => (
            <div key={row.day} className="rounded-2xl border border-pos-border p-3">
              <p className="text-[12px] font-medium text-pos-ink-muted">{row.day}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-pos-ink">{row.produced.toLocaleString()}</p>
              <p className="text-xs text-pos-ink-faint">planned {row.planned.toLocaleString()}</p>
            </div>
          ))}
          {rows.days.length === 0 && (
            <p className="col-span-full text-sm text-pos-ink-faint">No batches recorded yet — start from the Production desk.</p>
          )}
        </div>
      </article>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Products by volume</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Yield percentage per product, with recipe-standard cost where ingredients carry a catalogue cost.
            {rows.ingredientsUnpriced ? " Some recipe ingredients have no catalogue cost yet." : ""}
          </p>
        </header>
        {rows.products.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing produced yet — record a batch to populate this.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batches</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Planned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Yield</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Recipe cost/unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.products.map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.batches}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.planned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{row.produced.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                          style={{
                            background: row.pct >= 100 ? "rgba(16,185,129,0.12)" : row.pct >= 85 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)",
                            color: row.pct >= 100 ? "#10b981" : row.pct >= 85 ? "#d97706" : "#ef4444",
                          }}
                        >
                          {row.pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums" style={{ color: colors.primary }}>
                        {row.recipeCost ? naira(row.recipeCost) : <span className="text-pos-ink-faint">—</span>}
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