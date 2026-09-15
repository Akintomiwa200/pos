"use client";

import { useEffect, useMemo, useState } from "react";
import { Grid3X3, ReceiptText } from "lucide-react";
import { listExpenses, naira, type HqExpense } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function monthLabel(key: string) {
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-NG", { month: "short", year: "2-digit" }).replace(" ", " ");
}

export function ExpenseMatrixPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [expenses, setExpenses] = useState<HqExpense[] | null>(null);

  useEffect(() => {
    listExpenses().then(setExpenses).catch(() => setExpenses([]));
  }, []);

  const rows = useMemo(() => {
    if (!expenses) return null;
    const monthSet = new Set<string>();
    for (const expense of expenses) monthSet.add(expense.at.slice(0, 7));
    const months = [...monthSet].sort();
    const grid = new Map<string, Map<string, number>>();
    for (const expense of expenses) {
      const account = expense.account || "General";
      const cell = grid.get(account) ?? new Map<string, number>();
      cell.set(expense.at.slice(0, 7), (cell.get(expense.at.slice(0, 7)) ?? 0) + expense.amountMinor);
      grid.set(account, cell);
    }
    const accounts = [...grid.entries()].map(([account, cells]) => ({
      account,
      total: [...cells.values()].reduce((sum, value) => sum + value, 0),
      cells: months.map((month) => cells.get(month) ?? 0),
    }));
    accounts.sort((a, b) => b.total - a.total);
    const columnTotals = months.map((month, index) =>
      accounts.reduce((sum, row) => sum + row.cells[index], 0),
    );
    const grand = columnTotals.reduce((sum, value) => sum + value, 0);
    return { months, accounts, columnTotals, grand };
  }, [expenses]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Expenses · Performance overview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Expense performance overview</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            A period-by-period matrix of every expense account — spot trends and spikes at a glance.
          </p>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-pos-ink">Category × period matrix</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">
              {rows.accounts.length} accounts across {rows.months.length} months · {naira(rows.grand)} total
            </p>
          </div>
          <Grid3X3 size={18} className="text-pos-ink-faint" />
        </header>
        {rows.accounts.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No expenses yet — record expenses to build the matrix.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Account</th>
                    {rows.months.map((month) => (
                      <th key={month} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                        {monthLabel(month)}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.accounts.map((row) => (
                    <tr key={row.account} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.account}</td>
                      {row.cells.map((value, index) => (
                        <td key={index} className="px-3 py-3 text-right">
                          <span
                            className={`text-[13px] tabular-nums ${
                              value > 0 && value === row.total ? "font-semibold text-pos-ink" : "text-pos-ink-muted"
                            }`}
                          >
                            {value ? naira(value) : "·"}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-pos-ink">{naira(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-pos-border bg-pos-surface-muted">
                    <td className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-pos-ink-faint">Total</td>
                    {rows.columnTotals.map((value, index) => (
                      <td key={index} className="px-3 py-2.5 text-right text-[13px] font-bold tabular-nums text-pos-ink">
                        {naira(value)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                      {naira(rows.grand)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}