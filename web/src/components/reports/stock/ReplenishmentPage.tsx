"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, PackagePlus, Recycle, Truck } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { dayKey, listStockLevels, type StockLevel } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const LEAD_STORAGE = "pos.reports.replenishLeadDays";

function loadLead() {
  const raw = Number(window.localStorage.getItem(LEAD_STORAGE));
  return Number.isFinite(raw) && raw >= 0 ? raw : 3;
}

export function ReplenishmentPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [lead, setLead] = useState(3);

  useEffect(() => {
    setLead(loadLead());
    Promise.all([listStockLevels(), listSales()])
      .then(([lv, s]) => {
        setLevels(lv);
        setSales(s);
      })
      .catch(() => {
        setLevels([]);
        setSales([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!levels || !sales) return null;
    const days = new Set<string>();
    const soldUnits = new Map<string, number>();
    for (const sale of sales) {
      days.add(dayKey(sale.paidAt));
      for (const line of sale.lines ?? []) {
        soldUnits.set(line.itemId ?? "", (soldUnits.get(line.itemId ?? "") ?? 0) + line.quantity);
      }
    }
    const spanDays = Math.max(1, days.size);
    const items = levels
      .map((row) => {
        const qtySold = soldUnits.get(row.itemId) ?? 0;
        const avgDaily = qtySold / spanDays;
        const cover = avgDaily > 0 ? row.onHand / avgDaily : 0;
        const toReorder = Math.max(0, row.reorderPoint - row.onHand);
        const rec = Math.max(toReorder, Math.ceil(lead * avgDaily + row.reorderPoint - row.onHand));
        return { ...row, qtySold, avgDaily, coverDays: cover, toReorder, recommended: rec > 0 ? rec : null };
      })
      .filter((row) => row.onHand > 0 || row.reorderPoint > 0)
      .sort((a, b) => (b.recommended ?? 0) - (a.recommended ?? 0));
    return { items, spanDays };
  }, [levels, sales, lead]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const actionable = rows.items.filter((row) => row.recommended).length;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Inventory · Replenishment</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Inventory replenishment</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Recommended reorder quantities using your average daily sales, reorder levels, and a lead time you choose.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackagePlus size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Suggested orders</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{actionable}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">items under the line</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CalendarClock size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Sales window</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.spanDays} days</p>
                <p className="mt-0.5 truncate text-xs text-white/60">used to average daily demand</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-pos-ink">Suggested purchase quantities</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">
              Recommended ≤ cover to reorder level plus what you sell during the lead time.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-pos-ink-muted">
            <Truck size={14} className="text-pos-ink-faint" />
            Lead time
            <input
              type="number"
              min={0}
              value={lead}
              onChange={(event) => {
                const value = Math.max(0, Number(event.target.value) || 0);
                setLead(value);
                window.localStorage.setItem(LEAD_STORAGE, String(value));
              }}
              className="h-9 w-16 rounded-[10px] border border-pos-border bg-pos-surface-muted px-2 text-right text-[13px] tabular-nums text-pos-ink outline-none focus:border-pos-primary/60"
            />
            days
          </label>
        </header>
        {rows.items.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No stock level data yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">On hand</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sold ({rows.spanDays}d)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Daily avg</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Stock cover</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reorder level</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Suggested qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.items.map((row) => (
                    <tr key={row.itemId} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.onHand.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.qtySold.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.avgDaily.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[13px] font-semibold tabular-nums ${row.coverDays >= lead + 7 ? "text-emerald-600 dark:text-emerald-400" : row.coverDays >= lead ? "text-amber-600 dark:text-amber-400" : "text-pos-danger"}`}>
                          {row.avgDaily > 0 ? `${row.coverDays.toFixed(1)}d` : "∞"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {row.reorderPoint > 0 ? row.reorderPoint : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex min-w-[64px] items-center justify-end gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums ${
                            row.recommended ? "bg-pos-primary/10 text-pos-primary" : ""
                          }`}
                        >
                          <Recycle size={12} />
                          {row.recommended ?? "—"}
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