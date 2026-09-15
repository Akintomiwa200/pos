"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, ChevronDown, ChevronRight, Coins, PackageSearch } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { listCatalog } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionInventoryUsagePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [catalog, setCatalog] = useState<Array<{ name: string; costMinor: number; onHand: number; unit: string }>>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());

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
    const meta = new Map(catalog.map((row) => [row.name.toLowerCase(), row]));
    const recipeFor = new Map(book.recipes.map((recipe) => [
      recipe.productName.toLowerCase(),
      { yieldUnits: recipe.yieldUnits, ingredients: recipe.ingredients },
    ]));
    const consumed = new Map<string, { units: number; costMinor: number; usedOn: string[] }>();
    for (const batch of book.batches) {
      if (!["completed", "in-progress"].includes(batch.status)) continue;
      const recipe = recipeFor.get(batch.productName.toLowerCase());
      if (!recipe) continue;
      const scale = batch.producedUnits / Math.max(1, recipe.yieldUnits);
      for (const ing of recipe.ingredients) {
        const qty = ing.requiredUnits * scale;
        const row = consumed.get(ing.name) ?? { units: 0, costMinor: 0, usedOn: [] };
        row.units += qty;
        const cost = meta.get(ing.name.toLowerCase())?.costMinor ?? 0;
        row.costMinor += Math.round(qty * cost);
        row.usedOn.push(`${batch.number} · ${batch.productName}`);
        consumed.set(ing.name, row);
      }
    }
    const lines = [...consumed.entries()].map(([name, row]) => {
      const m = meta.get(name.toLowerCase());
      const coveragePct =
        m && m.onHand > 0 && row.units > 0 ? Math.round((m.onHand / row.units) * 1000) / 10 : m && row.units === 0 ? 100 : null;
      return { name, ...row, costMinor: Math.round(row.costMinor), onHand: m?.onHand ?? null, unit: m?.unit ?? "x", coveragePct };
    }).sort((a, b) => (a.coveragePct ?? 0) - (b.coveragePct ?? 0) || a.name.localeCompare(b.name));
    const totalCost = lines.reduce((sum, row) => sum + row.costMinor, 0);
    return { lines, totalCost };
  }, [book, catalog]);

  const toggle = (name: string) => {
    const next = new Set(open);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setOpen(next);
  };

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Inventory usage</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Inventory usage</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Ingredients drawn by completed and in-progress batches — how deep the stock went and how many batches worth
            of cover remains.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Ingredients used</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">distinct from recipes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Coins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Consumption value</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalCost)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">at current catalogue cost</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackageSearch size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">At risk</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.lines.filter((row) => row.coveragePct !== null && row.coveragePct < 25).length}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">under 25% stock cover</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Consumption vs stock on hand</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Lowest cover first. Expand a row to see which batches drew the ingredient.</p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No usage driven yet — completed batches with recipes will feed this view.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.lines.map((row) => (
              <div key={row.name} className="overflow-hidden rounded-2xl border border-pos-border">
                <button
                  onClick={() => toggle(row.name)}
                  className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-pos-surface-muted/50"
                >
                  {open.has(row.name) ? (
                    <ChevronDown size={16} className="shrink-0 text-pos-ink-faint" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-pos-ink-faint" />
                  )}
                  <span className="w-44 shrink-0 truncate text-[13px] font-medium text-pos-ink">{row.name}</span>
                  <span className="text-[13px] tabular-nums text-pos-ink">
                    {row.units.toLocaleString()} <span className="text-pos-ink-faint">{row.unit}</span>
                  </span>
                  <span className="hidden text-[13px] tabular-nums text-pos-ink-muted sm:inline">{naira(row.costMinor)}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {row.onHand === null ? (
                      <span className="inline-block rounded-full bg-pos-surface-muted px-2 py-0.5 text-[12px] text-pos-ink-faint">
                        no catalogue match
                      </span>
                    ) : (
                      <>
                        <span className="hidden text-[13px] tabular-nums text-pos-ink-muted md:inline">
                          on hand {row.onHand.toLocaleString()}
                        </span>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums"
                          style={{
                            background:
                              (row.coveragePct ?? 0) >= 100
                                ? "rgba(16,185,129,0.12)"
                                : (row.coveragePct ?? 0) >= 25
                                  ? "rgba(251,191,36,0.12)"
                                  : "rgba(239,68,68,0.12)",
                            color: (row.coveragePct ?? 0) >= 100 ? "#10b981" : (row.coveragePct ?? 0) >= 25 ? "#d97706" : "#ef4444",
                          }}
                        >
                          {row.coveragePct}% cover
                        </span>
                      </>
                    )}
                  </span>
                </button>
                {open.has(row.name) && (
                  <div className="border-t border-pos-border bg-pos-surface-muted/40 px-4 py-3">
                    <p className="text-[12px] text-pos-ink-muted">
                      Used on: {row.usedOn.join(", ") || "—"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}