"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge, TimerReset, Zap } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionEfficiencyPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>([]);

  useEffect(() => {
    Promise.all([
      getProductionBook().catch(() => null),
      listSales().catch(() => [] as HqSale[]),
    ])
      .then(([b, s]) => {
        setBook(b);
        setSales(s);
      })
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const sold = new Map<string, number>();
    for (const sale of sales ?? []) {
      for (const line of sale.lines ?? []) {
        if (!line.name) continue;
        sold.set(line.name, (sold.get(line.name) ?? 0) + line.quantity);
      }
    }
    const byProduct = new Map<string, { planned: number; produced: number; batches: number; completed: number }>();
    for (const batch of book.batches) {
      const row = byProduct.get(batch.productName) ?? { planned: 0, produced: 0, batches: 0, completed: 0 };
      row.planned += batch.plannedUnits;
      row.produced += batch.producedUnits;
      row.batches += 1;
      if (batch.status === "completed") row.completed += 1;
      byProduct.set(batch.productName, row);
    }
    const producedUnits = book.batches.reduce((sum, row) => sum + row.producedUnits, 0);
    const plannedUnits = book.batches.reduce((sum, row) => sum + row.plannedUnits, 0);
    const overallPct = plannedUnits > 0 ? Math.round((producedUnits / plannedUnits) * 1000) / 10 : 0;
    const soldUnits = producedUnits
      ? Math.round(([...sold.values()].reduce((sum, v) => sum + v, 0) / producedUnits) * 1000) / 10
      : 0;
    const products = [...byProduct.entries()].map(([product, row]) => ({
      product,
      ...row,
      pct: row.planned > 0 ? Math.round((row.produced / row.planned) * 1000) / 10 : 0,
      sold: sold.get(product) ?? 0,
      sellThrough: row.produced > 0 ? Math.round(((sold.get(product) ?? 0) / row.produced) * 1000) / 10 : 0,
    }));
    products.sort((a, b) => a.pct - b.pct);
    return { products, overallPct, plannedUnits, producedUnits, soldUnits };
  }, [book, sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Efficiency</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Production efficiency</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Output against plan, product by product — with sell-through telling you whether what came off the line is
            what customers are taking.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Gauge size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Overall efficiency</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.overallPct}%</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.producedUnits.toLocaleString()} of {rows.plannedUnits.toLocaleString()} units</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Zap size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Sell-through</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.soldUnits}%</p>
                <p className="mt-0.5 truncate text-xs text-white/60">sold vs produced</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TimerReset size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Fully on plan</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.products.filter((row) => row.pct >= 100).length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">products hitting ≥100%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Efficiency by product</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Sorted by yield against plan, weakest first.</p>
        </header>
        {rows.products.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Efficiency is measured once batches exist.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.products.map((row) => (
              <div key={row.product} className="rounded-2xl border border-pos-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-pos-ink">{row.product}</p>
                  <p className="text-[13px] tabular-nums text-pos-ink-muted">
                    {row.produced.toLocaleString()}/{row.planned.toLocaleString()} units
                    {row.sold ? ` · sold ${row.sold.toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.pct)}%`, background: row.pct >= 100 ? "#10b981" : row.pct >= 85 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <span className="w-16 text-right text-[13px] font-semibold tabular-nums" style={{ color: colors.primary }}>{row.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}