"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Coins, Recycle, Trash2 } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProductionWastePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const batchFor = new Map(book.batches.map((b) => [b.id, b]));
    const sorted = [...book.waste].sort((a, b) => b.at.localeCompare(a.at));
    const byItem = new Map<string, { quantity: number; costMinor: number; reason: string }>();
    for (const row of book.waste) {
      const agg = byItem.get(row.itemName) ?? { quantity: 0, costMinor: 0, reason: row.reason };
      agg.quantity += row.quantity;
      agg.costMinor += row.quantity * row.unitCostMinor;
      byItem.set(row.itemName, agg);
    }
    const top = [...byItem.entries()].map(([item, agg]) => ({ item, ...agg, costMinor: Math.round(agg.costMinor) }))
      .sort((a, b) => b.costMinor - a.costMinor)
      .slice(0, 6);
    const totals = {
      quantity: book.waste.reduce((sum, row) => sum + row.quantity, 0),
      value: book.waste.reduce((sum, row) => sum + row.quantity * row.unitCostMinor, 0),
      entries: book.waste.length,
    };
    return { rows: sorted, batchFor, top, totals };
  }, [book]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Waste</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Waste</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Material written off at the line — what went to scrap, how much it cost, and which product it came from.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Trash2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Value written off</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totals.value)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">appraisal of all waste</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Quantity scrapped</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.totals.quantity.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">units across {rows.totals.entries} entries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Coins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Costliest item</p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">
                  {rows.top[0] ? (rows.top[0].costMinor >= 1000 ? naira(rows.top[0].costMinor) : "") || rows.top[0].item.slice(0, 22) : "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.top[0] ? `${naira(rows.top[0].costMinor)} total` : "no waste yet"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {rows.top.length > 0 && (
        <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4">
            <h2 className="font-semibold text-pos-ink">Where the waste concentrates</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Materials with the heaviest cost impact, by value.</p>
          </header>
          <div className="space-y-2">
            {rows.top.map((row) => (
              <div key={row.item} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-[13px] text-pos-ink-muted">{row.item}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                  <div className="h-full rounded-full" style={{ width: `${(row.costMinor / rows.top[0].costMinor) * 100}%`, background: colors.primary }} />
                </div>
                <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.costMinor)}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Waste log</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Newest first, matched to its batch where given.</p>
        </header>
        {rows.rows.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing scrapped — the register is clean.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batch</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Item</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Qty</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Unit cost</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Value</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reason</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.rows.map((row) => {
                    const batch = row.batchId ? rows.batchFor.get(row.batchId) : undefined;
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{batch?.number ?? (row.batchId ? row.batchId.slice(0, 8) : "—")}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.itemName}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.unitCostMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-red-500">{naira(Math.round(row.quantity * row.unitCostMinor))}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-[13px] text-pos-ink-muted" title={row.reason}>{row.reason}</td>
                        <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{new Date(row.at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}