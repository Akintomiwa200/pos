"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, ReceiptText, Trophy, UsersRound } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function TopCustomersPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales()
      .then(setSales)
      .catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const byCustomer = new Map<string, { name: string; tickets: number; spendMinor: number; firstAt: string; lastAt: string }>();
    for (const sale of sales) {
      const name = (sale.customerName || "* walk-in").trim();
      const row = byCustomer.get(name) ?? {
        name,
        tickets: 0,
        spendMinor: 0,
        firstAt: sale.paidAt,
        lastAt: sale.paidAt,
      };
      row.tickets += 1;
      row.spendMinor += sale.totalMinor;
      if (sale.paidAt < row.firstAt) row.firstAt = sale.paidAt;
      if (sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      byCustomer.set(name, row);
    }
    const lines = [...byCustomer.values()]
      .filter((row) => row.spendMinor > 0)
      .sort((a, b) => b.spendMinor - a.spendMinor)
      .slice(0, 50);
    const totalSpend = lines.reduce((sum, row) => sum + row.spendMinor, 0);
    const ranked = lines.map((row, index) => ({
      ...row,
      rank: index + 1,
      avgMinor: row.tickets > 0 ? Math.round(row.spendMinor / row.tickets) : 0,
      share: totalSpend > 0 ? Math.round((row.spendMinor / totalSpend) * 1000) / 10 : 0,
    }));
    const monthMs = 30.4375 * 86400000;
    return { lines: ranked, totalSpend, months: Math.max(1, Math.round((Date.now() - Math.min(...sales.map((s) => new Date(s.paidAt).getTime()))) / monthMs)) };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Entities · Top customers</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Top customers</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Who actually pays your bills — ranked by lifetime spend, with tickets, average basket and frequency per
            month.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Trophy size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Top customer</p>
                <p className="mt-1 truncate text-lg font-bold tracking-tight">{rows.lines[0]?.name ?? "—"}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.lines[0] ? naira(rows.lines[0].spendMinor) : ""} lifetime</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UsersRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Active buyers</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}+</p>
                <p className="mt-0.5 truncate text-xs text-white/60">ranked here by spend</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ReceiptText size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Lifetime sales covered</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalSpend)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across roughly {rows.months} month{rows.months === 1 ? "" : "s"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Leaderboard</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Top 50 by cash collected; frequency is tickets per month of history.</p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No recorded sales yet — this board fills in as the till runs.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">#</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Tickets</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Avg basket</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Frequency/mo</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Lifetime spend</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.name} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: row.rank <= 3 ? "rgba(251,191,36,0.15)" : "rgba(148,163,184,0.12)", color: row.rank <= 3 ? "#d97706" : "inherit" }}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">
                        <span className="inline-flex items-center gap-2">
                          {row.name}
                          {row.rank === 1 && <Award size={14} className="text-amber-500" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.avgMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {(row.tickets / rows.months).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.spendMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums" style={{ color: colors.primary }}>
                        {row.share}%
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