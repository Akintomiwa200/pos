"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Coins, ShieldCheck, WalletMinimal } from "lucide-react";
import { listExpenses, naira, type HqExpense } from "@/lib/hq-ops";
import { listPrepaids, type LedgerPrepaid } from "@/lib/hq-ledger";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const PREPAID_HINTS = ["prepaid", "pre-paid", "insurance", "premium", "subscription", "license", "licence", "rent in advance", "retainer", "deposit", "maintenance"];

function isPrepaid(account: string) {
  const a = account.toLowerCase();
  return PREPAID_HINTS.some((hint) => a.includes(hint));
}

export function PrepaidPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [expenses, setExpenses] = useState<HqExpense[] | null>(null);
  const [ledgerPrepaids, setLedgerPrepaids] = useState<LedgerPrepaid[] | null>(null);

  useEffect(() => {
    Promise.all([listExpenses(), listPrepaids()])
      .then(([e, l]) => {
        setExpenses(e);
        setLedgerPrepaids(l);
      })
      .catch(() => {
        setExpenses([]);
        setLedgerPrepaids([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!expenses || !ledgerPrepaids) return null;
    const monthMs = 30.4375 * 86400000;
    const ledgerRows = ledgerPrepaids.map((row) => {
      const remainingMinor = Math.max(0, row.amountMinor - row.consumedMinor);
      const status = remainingMinor === 0 ? "fully consumed" : "prepaid";
      return {
        account: "Ledger",
        description: row.name,
        at: row.startedAt,
        originalMinor: row.amountMinor,
        consumedMinor: row.consumedMinor,
        remainingMinor,
        monthsElapsed: row.months,
        status,
        ledgerId: row.id,
      };
    });
    const expenseRows = expenses
      .filter((row) => isPrepaid(row.account))
      .map((row) => {
        const originalMinor = row.amountMinor;
        const monthsElapsed = Math.max(0, Math.floor((Date.now() - new Date(row.at).getTime()) / monthMs));
        const consumedMinor = originalMinor > 0 ? Math.round((Math.min(1, monthsElapsed / 12) * originalMinor) / 10) * 10 : 0;
        const remainingMinor = Math.max(0, originalMinor - consumedMinor);
        const status = originalMinor > 0 && remainingMinor === 0 ? "fully consumed" : monthsElapsed >= 12 ? "over 12 months" : "prepaid";
        return {
          account: row.account,
          description: row.description || row.account,
          at: row.at,
          originalMinor,
          consumedMinor,
          remainingMinor,
          monthsElapsed,
          status,
          ledgerId: undefined as string | undefined,
        };
      });
    const schedule = [...ledgerRows, ...expenseRows].sort((a, b) => b.remainingMinor - a.remainingMinor || b.monthsElapsed - a.monthsElapsed);
    const totalPrepaid = schedule.reduce((sum, row) => sum + row.originalMinor, 0);
    const totalRemaining = schedule.reduce((sum, row) => sum + row.remainingMinor, 0);
    return { schedule, totalRemaining, totalPrepaid };
  }, [expenses, ledgerPrepaids]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Money · Prepaid schedules</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Prepaid schedules</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Payments made ahead of consumption — insurance, subscriptions and prepaid rents spread across twelve months,
            showing what is still good on the books.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CalendarClock size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Prepaid entries</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.schedule.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">paid in advance</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Coins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Paid up front</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalPrepaid)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">original amounts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShieldCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Still prepaid</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight" style={{ color: "#6ee7b7" }}>
                  {naira(rows.totalRemaining)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">value not yet consumed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Prepaid register</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Straight-line consumption over 12 months from payment date — amounts are recognised as expense as time
            passes.
          </p>
        </header>
        {rows.schedule.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No prepaid expenses found — insurance, subscriptions or prepaid rents will show up here when booked.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Item</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Paid</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Original</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Consumed</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Remaining</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.schedule.map((row) => (
                    <tr key={`${row.account}-${row.at}`}>
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-pos-ink">{row.account}</div>
                        <div className="text-xs text-pos-ink-faint">{row.description}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {new Date(row.at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.originalMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.consumedMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums" style={{ color: colors.primary }}>
                        {naira(row.remainingMinor)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                          style={
                            row.remainingMinor > 0
                              ? { background: "rgba(59,130,246,0.12)", color: "#3b82f6" }
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