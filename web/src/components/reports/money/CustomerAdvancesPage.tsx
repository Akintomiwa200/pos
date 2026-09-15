"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, HandCoins, UsersRound } from "lucide-react";
import { api } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { listAdvances, type LedgerAdvance } from "@/lib/hq-ledger";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const ADVANCE_TERMS = ["deposit", "advance", "prepaid", "pre-pay", "retainer", "commitment", "top-up"];

function isAdvanceTender(tender: string) {
  const t = tender.trim().toLowerCase();
  return ADVANCE_TERMS.some((term) => t.includes(term));
}

export function CustomerAdvancesPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<Array<{ customerName?: string; tender: string; paidAt: string; totalMinor: number }> | null>(null);
  const [ledgerAdvances, setLedgerAdvances] = useState<LedgerAdvance[] | null>(null);

  useEffect(() => {
    Promise.all([
      api<Array<{ customerName?: string; tender: string; paidAt: string; totalMinor: number }>>("/api/sales"),
      listAdvances(),
    ])
      .then(([s, a]) => {
        setSales(s);
        setLedgerAdvances(a);
      })
      .catch(() => {
        setSales([]);
        setLedgerAdvances([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !ledgerAdvances) return null;
    const byCustomer = new Map<string, { advanceMinor: number; usedMinor: number; lastAt: string; tickets: number }>();
    for (const sale of sales) {
      const name = (sale.customerName || "* walk-in").trim();
      const row = byCustomer.get(name) ?? { advanceMinor: 0, usedMinor: 0, lastAt: "", tickets: 0 };
      if (isAdvanceTender(sale.tender)) {
        row.advanceMinor += sale.totalMinor;
      } else {
        row.usedMinor += sale.totalMinor;
      }
      row.tickets += 1;
      if (!row.lastAt || sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      byCustomer.set(name, row);
    }
    for (const adv of ledgerAdvances) {
      const name = adv.customerName.trim() || "* unknown";
      const row = byCustomer.get(name) ?? { advanceMinor: 0, usedMinor: 0, lastAt: adv.at, tickets: 0 };
      row.advanceMinor += adv.amountMinor;
      row.usedMinor += adv.appliedMinor;
      if (adv.at > row.lastAt) row.lastAt = adv.at;
      byCustomer.set(name, row);
    }
    const lines = [...byCustomer.entries()]
      .filter(([, row]) => row.advanceMinor > 0)
      .map(([customer, row]) => {
        const netMinor = row.advanceMinor - row.usedMinor;
        const status = netMinor > 0 ? "in advance" : netMinor === 0 ? "fully used" : "over-used";
        return { customer, ...row, netMinor, status };
      })
      .sort((a, b) => b.netMinor - a.netMinor);
    const totalAdvance = lines.reduce((sum, row) => sum + row.advanceMinor, 0);
    const totalNet = lines.reduce((sum, row) => sum + row.netMinor, 0);
    return { lines, totalAdvance, totalNet };
  }, [sales, ledgerAdvances]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Money · Customer advances</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Customer advances</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Customers who hold money on account — deposits logged on the Accounting desk plus deposit-style tenders
            captured at the till, reconciled against what they have since bought.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UsersRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Customers with advances</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across deposit-style tenders</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><HandCoins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Held on account</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalNet)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">advances not yet spent</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ArrowUpRight size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Lifetime deposited</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalAdvance)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">total advance tenders accepted</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Advance register</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            A sale is treated as an advance when its tender reads like a deposit/advance — label your deposit tender
            accordingly at the till to keep this reconciled.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No advance tenders detected — deposits will appear here when a customer pays ahead of a purchase.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Deposited</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Spent</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Net on account</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.customer}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.customer}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.advanceMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.usedMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.netMinor)}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                          style={
                            row.netMinor > 0
                              ? { background: "rgba(59,130,246,0.12)", color: "#3b82f6" }
                              : row.netMinor < 0
                                ? { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                                : { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                          }
                        >
                          {row.status}
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