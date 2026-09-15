"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ReceiptText, TrendingDown, UserRound } from "lucide-react";
import { listExpenses, naira, type HqExpense } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ExpenseOverviewPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [expenses, setExpenses] = useState<HqExpense[] | null>(null);

  useEffect(() => {
    listExpenses().then(setExpenses).catch(() => setExpenses([]));
  }, []);

  const rows = useMemo(() => {
    if (!expenses) return null;
    const byAccount = new Map<string, { account: string; count: number; amountMinor: number }>();
    const byMonth = new Map<string, { month: string; count: number; amountMinor: number }>();
    const byStaff = new Map<string, { staff: string; count: number; amountMinor: number }>();
    for (const expense of expenses) {
      const account = expense.account || "General";
      const aRow = byAccount.get(account) ?? { account, count: 0, amountMinor: 0 };
      aRow.count += 1;
      aRow.amountMinor += expense.amountMinor;
      byAccount.set(account, aRow);

      const month = expense.at.slice(0, 7);
      const mRow = byMonth.get(month) ?? { month, count: 0, amountMinor: 0 };
      mRow.count += 1;
      mRow.amountMinor += expense.amountMinor;
      byMonth.set(month, mRow);

      if (expense.staff) {
        const sRow = byStaff.get(expense.staff) ?? { staff: expense.staff, count: 0, amountMinor: 0 };
        sRow.count += 1;
        sRow.amountMinor += expense.amountMinor;
        byStaff.set(expense.staff, sRow);
      }
    }
    const accounts = [...byAccount.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    const staff = [...byStaff.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const totalMinor = accounts.reduce((sum, row) => sum + row.amountMinor, 0);
    const sorted = [...expenses].sort((a, b) => b.at.localeCompare(a.at));
    return { accounts, months, staff, totalMinor, recent: sorted.slice(0, 12) };
  }, [expenses]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Expenses · Overview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Expense overview</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Your spend at a glance — total, monthly trend, the accounts eating the most, and who is spending.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ReceiptText size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total expenses</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{expenses?.length ?? 0} expense records</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CalendarDays size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Months active</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.months.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  {rows.months.at(-1)?.month ?? "—"} latest month
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UserRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Spenders</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.staff.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">staff attributed to expenses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Spend by account</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Where the money went</p>
          </header>
          <ul className="mt-4 space-y-3">
            {rows.accounts.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No expenses yet.</p>
            ) : (
              rows.accounts.slice(0, 8).map((row) => {
                const max = rows.accounts[0]?.amountMinor || 1;
                return (
                  <li key={row.account}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-pos-ink">{row.account}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-pos-ink">{naira(row.amountMinor)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
                      <div className="h-full rounded-full bg-pos-primary" style={{ width: `${(row.amountMinor / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Monthly trend</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Total spend per month</p>
          </header>
          <ul className="mt-4 space-y-3">
            {rows.months.map((row) => {
              const max = rows.months.reduce((m, r) => Math.max(m, r.amountMinor), 1);
              return (
                <li key={row.month}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="tabular-nums text-pos-ink-muted">{row.month}</span>
                    <span className="tabular-nums text-pos-ink-faint">{row.count} records</span>
                    <span className="font-semibold tabular-nums text-pos-ink">{naira(row.amountMinor)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
                    <div className="h-full rounded-full bg-pos-primary" style={{ width: `${(row.amountMinor / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-pos-ink-faint" />
            <h2 className="font-semibold text-pos-ink">Recent expenses</h2>
          </header>
          {rows.recent.length === 0 ? (
            <div className="grid h-[140px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
              None yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-pos-border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-pos-border bg-pos-surface-muted">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Date</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Account</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/60">
                    {rows.recent.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-4 py-2.5 text-[12px] tabular-nums text-pos-ink-muted">{expense.at.slice(0, 10)}</td>
                        <td className="px-4 py-2.5 text-[12px] text-pos-ink">{expense.description || expense.account}</td>
                        <td className="px-4 py-2.5 text-right text-[12px] font-semibold tabular-nums text-pos-ink">{naira(expense.amountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Spend by staff</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Expenses attributed to a person</p>
          </header>
          <ul className="mt-4 space-y-3">
            {rows.staff.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No staff-attributed spend.</p>
            ) : (
              rows.staff.slice(0, 8).map((row) => (
                <li key={row.staff} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-pos-ink">{row.staff}</span>
                  <span className="shrink-0 text-xs text-pos-ink-faint">{row.count} records</span>
                  <span className="shrink-0 font-semibold tabular-nums text-pos-ink">{naira(row.amountMinor)}</span>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </div>
  );
}