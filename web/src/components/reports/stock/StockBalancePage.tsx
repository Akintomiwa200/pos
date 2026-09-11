"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Boxes, PackageCheck, Radio } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog } from "@/lib/hq-api";
import { listStockLevels, naira, type StockLevel } from "@/lib/hq-ops";
import { formatStock } from "@/lib/units";
import { syncStockLevelsFromCatalog, useLiveCatalog } from "@/lib/live-catalog";
import { ManagerSkeleton } from "../../Skeleton";

export function StockBalancePage() {
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const { items: catalog, setItems: setCatalog, live } = useLiveCatalog();

  async function load() {
    const [rows, items] = await Promise.all([listStockLevels(), listCatalog()]);
    setLevels(rows);
    setCatalog(items);
  }

  useEffect(() => {
    if (!catalog.length) return;
    setLevels((current) => (current ? syncStockLevelsFromCatalog(current, catalog) : current));
  }, [catalog]);

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load stock");
      setLevels([]);
    });
  }, []);

  const low = useMemo(() => (levels ?? []).filter((row) => row.onHand <= row.reorderPoint), [levels]);
  const out = useMemo(() => (levels ?? []).filter((row) => row.onHand <= 0), [levels]);

  if (!levels) return <ManagerSkeleton variant="table" />;

  const totalValue = levels.reduce((sum, row) => sum + row.valueMinor, 0);
  const pctHealthy = levels.length ? Math.round(((levels.length - low.length) / levels.length) * 100) : 0;
  const gauge = pctHealthy >= 80 ? "bg-pos-success" : pctHealthy >= 50 ? "bg-pos-warning" : "bg-pos-danger";

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Stock
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Stock balance</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            What is on the shelf right now, synced live from every till.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-pos-md ${
            live ? "bg-pos-surface text-pos-success" : "bg-pos-surface text-pos-ink-faint"
          }`}
        >
          <Radio size={15} className={live ? "animate-pulse text-pos-success" : ""} />
          {live ? "Live sync on" : "Falling back to snapshot"}
        </span>
      </header>

      <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <article className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
            <Activity size={14} /> Stock health
          </p>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative grid h-28 w-28 shrink-0 place-items-center">
              <div className="h-28 w-28 rounded-full bg-pos-surface-muted" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(var(--pos-primary) ${pctHealthy}%, var(--pos-surface-muted) 0)`,
                  WebkitMask: "radial-gradient(circle at center, transparent 62%, #000 63%)",
                  mask: "radial-gradient(circle at center, transparent 62%, #000 63%)",
                }}
              />
              <div className="relative text-center">
                <p className="text-2xl font-bold tabular-nums text-pos-ink">{pctHealthy}%</p>
                <p className="text-[10px] uppercase tracking-wide text-pos-ink-faint">healthy</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-4xl font-bold tabular-nums tracking-tight text-pos-ink">
                {naira(totalValue, 0)}
              </p>
              <p className="mt-1 text-sm text-pos-ink-muted">total stock value across the group</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pos-success" />
                <span className="text-xs text-pos-ink-faint">
                  {levels.length - low.length} items at or above reorder point
                </span>
              </div>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
              <Boxes size={19} />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wide text-pos-ink-faint">SKUs tracked</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-pos-ink">{levels.length}</p>
          </div>
          <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-pos-warning/15 text-pos-warning">
              <AlertTriangle size={19} />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wide text-pos-ink-faint">Low stock</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-pos-ink">{low.length}</p>
            <p className="mt-1 text-xs text-pos-ink-faint">At or below reorder point</p>
          </div>
          <div className="col-span-2 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-pos-danger/15 text-pos-danger">
                <PackageCheck size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Out of stock</p>
                <p className="text-xl font-bold tabular-nums text-pos-ink">{out.length} items</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const rail = document.getElementById("low-rail");
                  rail?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="shrink-0 rounded-full bg-pos-surface-muted px-4 py-2 text-xs font-semibold text-pos-ink-muted transition hover:bg-pos-primary-soft hover:text-pos-primary"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <header className="border-b border-pos-border px-5 py-4">
          <h2 className="font-semibold text-pos-ink">Shelf snapshot</h2>
          <p className="mt-0.5 text-xs text-pos-ink-faint">{levels.length} lines, sorted by value</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 680 }}>
            <thead className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3 text-right">On hand</th>
                <th className="px-5 py-3 text-right">Reorder at</th>
                <th className="px-5 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {levels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                    No stock records.
                  </td>
                </tr>
              ) : (
                [...levels]
                  .sort((a, b) => b.valueMinor - a.valueMinor)
                  .map((row) => {
                    const isLow = row.onHand <= row.reorderPoint;
                    return (
                      <tr key={row.itemId} className="hover:bg-pos-surface-muted/50">
                        <td className="px-5 py-3.5 font-medium text-pos-ink">
                          <span
                            className={`mr-2 inline-block h-2 w-2 rounded-full ${
                              row.onHand <= 0
                                ? "bg-pos-danger"
                                : isLow
                                  ? "bg-pos-warning"
                                  : "bg-pos-success"
                            }`}
                          />
                          {row.name}
                        </td>
                        <td className="px-5 py-3.5 text-pos-ink-muted">{row.category}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-pos-ink-faint">{row.sku || "—"}</td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className={isLow ? "font-semibold text-pos-warning" : "font-medium text-pos-ink"}>
                            {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink-faint">
                          {row.reorderPoint}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-pos-ink">
                          {naira(row.valueMinor, 0)}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {low.length > 0 ? (
        <section id="low-rail" className="mt-5 scroll-mt-6 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <header className="flex items-center justify-between">
            <h2 className="font-semibold text-pos-ink">Needs attention</h2>
            <span className="rounded-full bg-pos-warning/15 px-3 py-1 text-xs font-semibold text-pos-warning">
              {low.length} low
            </span>
          </header>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {low.map((row) => (
              <li key={row.itemId} className="flex items-center gap-3 rounded-xl bg-pos-surface-muted/60 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-pos-ink">{row.name}</p>
                  <p className="text-xs text-pos-ink-faint">
                    {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)} · reorder at {row.reorderPoint}
                  </p>
                </div>
                {row.onHand <= 0 ? (
                  <span className="shrink-0 rounded-full bg-pos-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase text-pos-danger">
                    Out
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-pos-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-pos-warning">
                    Low
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}