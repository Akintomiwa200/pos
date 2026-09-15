"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, UsersRound, Wallet2 } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listCredits } from "@/lib/hq-customers";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function DormantCustomersPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [receivables, setReceivables] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    Promise.all([
      listSales().catch(() => [] as HqSale[]),
      listCredits().catch(() => []),
    ])
      .then(([saleRows, creditRows]) => {
        const map = new Map<string, number>();
        for (const credit of creditRows as Array<{ customerName: string; balanceMinor: number }>) {
          map.set(credit.customerName.trim().toLowerCase(), credit.balanceMinor);
        }
        setReceivables(map);
        setSales(saleRows);
      })
      .catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const byCustomer = new Map<string, { name: string; tickets: number; spendMinor: number; lastAt: string }>();
    for (const sale of sales) {
      const name = (sale.customerName || "* walk-in").trim();
      const row = byCustomer.get(name) ?? { name, tickets: 0, spendMinor: 0, lastAt: sale.paidAt };
      row.tickets += 1;
      row.spendMinor += sale.totalMinor;
      if (sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      byCustomer.set(name, row);
    }
    const threshold = 30 * 86400000;
    const dormant = [...byCustomer.values()]
      .map((row) => {
        const lastMs = new Date(row.lastAt).getTime();
        const days = Math.max(0, Math.floor((Date.now() - lastMs) / 86400000));
        const receivable = receivables.get(row.name.trim().toLowerCase()) ?? 0;
        return { ...row, days, receivable };
      })
      .filter((row) => row.days >= 30)
      .sort((a, b) => b.days - a.days);
    const owedBack = dormant
      .filter((row) => row.receivable > 0)
      .reduce((sum, row) => sum + row.receivable, 0);
    return { dormant, owedBack };
  }, [sales, receivables]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Entities · Dormant customers</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Dormant customers</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Buyers who have not returned in a month — each one is a reactivation call, especially the ones who still owe
            you money.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Moon size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Dormant 30d+</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.dormant.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">no purchase this month</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Sun size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Furthest gone</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.dormant[0] ? `${rows.dormant[0].days}d` : "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">longest since last visit</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Owed by dormant</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight" style={{ color: "#fbbf24" }}>
                  {naira(rows.owedBack)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">on their credit accounts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Dormancy list</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">30 days of silence counts as dormant; balances flag anyone still on credit.</p>
        </header>
        {rows.dormant.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nobody dormant — everyone has bought within the last 30 days.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Last purchase</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Days gone</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Lifetime</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Receivable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.dormant.slice(0, 100).map((row) => (
                    <tr key={row.name} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {new Date(row.lastAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                          style={{
                            background: row.days >= 90 ? "rgba(239,68,68,0.12)" : row.days >= 60 ? "rgba(251,191,36,0.12)" : "rgba(148,163,184,0.12)",
                            color: row.days >= 90 ? "#ef4444" : row.days >= 60 ? "#d97706" : "inherit",
                          }}
                        >
                          {row.days}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.spendMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        {row.receivable > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{naira(row.receivable)}</span>
                        ) : (
                          <span className="text-pos-ink-faint">—</span>
                        )}
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