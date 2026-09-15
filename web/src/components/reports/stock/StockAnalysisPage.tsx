"use client";

import { useEffect, useMemo, useState } from "react";
import { Blocks, CalendarClock, TrendingDown, TrendingUp } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listMovements, listStockLevels, naira, type StockLevel, type StockMovement } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StockAnalysisPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [movements, setMovements] = useState<StockMovement[] | null>(null);

  useEffect(() => {
    Promise.all([listStockLevels(), listSales(), listMovements()])
      .then(([lv, s, m]) => {
        setLevels(lv);
        setSales(s);
        setMovements(m);
      })
      .catch(() => {
        setLevels([]);
        setSales([]);
        setMovements([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!levels || !sales || !movements) return null;
    const sold = new Map<string, number>();
    for (const sale of sales) {
      for (const line of sale.lines ?? []) {
        sold.set(line.itemId ?? "", (sold.get(line.itemId ?? "") ?? 0) + line.quantity * line.unitPriceMinor);
      }
    }
    const lastActivity = new Map<string, string>();
    for (const move of movements) {
      const prev = lastActivity.get(move.itemId);
      if (!prev || move.at > prev) lastActivity.set(move.itemId, move.at);
    }
    const today = Date.now();

    const items = levels.map((row) => {
      const revenue = sold.get(row.itemId) ?? 0;
      const last = lastActivity.get(row.itemId);
      const daysSince = last ? Math.max(0, Math.floor((today - new Date(last).getTime()) / 86400000)) : null;
      return { ...row, revenue, daysSince };
    });

    const ranked = items.filter((row) => row.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = ranked.reduce((sum, row) => sum + row.revenue, 0);
    let cumulative = 0;
    const classes = new Map<string, "A" | "B" | "C">();
    for (const row of ranked) {
      cumulative += row.revenue;
      const share = totalRevenue ? cumulative / totalRevenue : 0;
      classes.set(row.itemId, share <= 0.7 ? "A" : share <= 0.9 ? "B" : "C");
    }
    const withClass = items.map((row) => ({ ...row, abc: row.revenue > 0 ? (classes.get(row.itemId) ?? "C") : "C" }));

    const aging = [
      { label: "Inactive (no movement record)", rows: withClass.filter((row) => row.daysSince === null) },
      { label: "0–7 days", rows: withClass.filter((row) => row.daysSince !== null && row.daysSince <= 7) },
      { label: "8–30 days", rows: withClass.filter((row) => row.daysSince !== null && row.daysSince > 7 && row.daysSince <= 30) },
      { label: "31–90 days", rows: withClass.filter((row) => row.daysSince !== null && row.daysSince > 30 && row.daysSince <= 90) },
      { label: "91–180 days", rows: withClass.filter((row) => row.daysSince !== null && row.daysSince > 90 && row.daysSince <= 180) },
      { label: "180+ days", rows: withClass.filter((row) => row.daysSince !== null && row.daysSince > 180) },
    ].map((group) => ({
      label: group.label,
      valueMinor: group.rows.reduce((sum, row) => sum + row.valueMinor, 0),
      items: group.rows.length,
    }));

    const abcRows = (["A", "B", "C"] as const).map((letter) => {
      const members = withClass.filter((row) => row.abc === letter);
      return {
        letter,
        revenue: members.reduce((sum, row) => sum + row.revenue, 0),
        value: members.reduce((sum, row) => sum + row.valueMinor, 0),
        items: members.length,
      };
    });

    return { withClass, abcRows, aging, totalRevenue };
  }, [levels, sales, movements]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const abcColor = (letter: "A" | "B" | "C") =>
    letter === "A"
      ? "bg-pos-primary/10 text-pos-primary"
      : letter === "B"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-pos-danger/10 text-pos-danger";

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Inventory · ABC + aging</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Inventory analysis</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Where your money is tied up: ABC importance by sales contribution, and stock aged by days since its last
            movement or count.
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
              <Blocks size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">ABC classification</h2>
              <p className="text-xs text-pos-ink-faint">A ≈ 70% of sales, B ≈ 20%, C ≈ 10%</p>
            </div>
          </header>
          <div className="space-y-3">
            {rows.abcRows.map((row) => (
              <div key={row.letter}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-bold ${abcColor(row.letter)}`}>
                    {row.letter}
                  </span>
                  <span className="text-[13px] text-pos-ink-muted">{row.items} items</span>
                  <span className="font-semibold tabular-nums text-pos-ink">{naira(row.revenue)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
                  <div
                    className="h-full rounded-full bg-pos-primary"
                    style={{ width: `${rows.totalRevenue ? (row.revenue / rows.totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-[11px] text-pos-ink-faint">
              Stock value held by each class: {rows.abcRows.map((row) => `${row.letter} ${naira(row.value)}`).join(" · ")}
            </p>
          </div>
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarClock size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">Stock aging</h2>
              <p className="text-xs text-pos-ink-faint">Value tied up by days since last movement / count</p>
            </div>
          </header>
          <ul className="space-y-2.5">
            {rows.aging.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2 text-pos-ink-muted">
                  <TrendingDown size={13} className={`${row.label.includes("180") || row.label.includes("91") ? "text-pos-danger" : "text-pos-ink-faint"}`} />
                  {row.label}
                </span>
                <span className="font-semibold tabular-nums text-pos-ink">{naira(row.valueMinor)}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Every product, classified</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Sales contribution marks the ABC class; the age column is days since an item&apos;s latest stock movement.
          </p>
        </header>
        {rows.withClass.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No stock level data yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Class</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">On hand</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Value</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Days since activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.withClass.map((row) => (
                    <tr key={row.itemId} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${abcColor(row.abc)}`}>
                          {row.abc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.revenue ? naira(row.revenue) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.onHand.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.valueMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {row.daysSince === null ? "—" : row.daysSince > 90 ? <span className="text-pos-danger">{row.daysSince}d</span> : `${row.daysSince}d`}
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