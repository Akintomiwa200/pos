"use client";

import { useEffect, useMemo, useState } from "react";
import { BanknoteArrowUp, HandCoins, ShieldCheck, UserRound } from "lucide-react";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { listExpenses, naira, type HqExpense } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const ADVANCE_HINTS = ["advance", "deposit", "float", "loan", "prepaid", "petty", "retainer"];

function isAdvance(account: string) {
  const name = account.toLowerCase();
  return ADVANCE_HINTS.some((hint) => name.includes(hint));
}

export function RequestsAdvancesPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [expenses, setExpenses] = useState<HqExpense[] | null>(null);
  const [accounts, setAccounts] = useState<DirectoryRecord[] | null>(null);

  useEffect(() => {
    Promise.all([listExpenses(), listDirectory("expense-accounts")])
      .then(([e, a]) => {
        setExpenses(e);
        setAccounts(a);
      })
      .catch(() => {
        setExpenses([]);
        setAccounts([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!expenses || !accounts) return null;
    const advanceAccounts = new Set<string>();
    for (const account of accounts) {
      if (isAdvance(account.name)) advanceAccounts.add(account.name);
    }
    for (const expense of expenses) {
      if (isAdvance(expense.account)) advanceAccounts.add(expense.account);
    }
    const advances = expenses.filter((expense) => advanceAccounts.has(expense.account));
    const requested = expenses.length
      ? expenses.reduce((sum, expense) => sum + expense.amountMinor, 0)
      : 0;
    const advancedMinor = advances.reduce((sum, expense) => sum + expense.amountMinor, 0);
    const byStaff = new Map<string, { staff: string; count: number; amountMinor: number }>();
    for (const expense of advances) {
      const staff = expense.staff || "Unassigned";
      const row = byStaff.get(staff) ?? { staff, count: 0, amountMinor: 0 };
      row.count += 1;
      row.amountMinor += expense.amountMinor;
      byStaff.set(staff, row);
    }
    const staffRows = [...byStaff.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const accountRows = [...advanceAccounts].map((account) => {
      const rows: HqExpense[] = [];
      for (const expense of advances) if (expense.account === account) rows.push(expense);
      return {
        account,
        count: rows.length,
        amountMinor: rows.reduce((sum, expense) => sum + expense.amountMinor, 0),
      };
    });
    accountRows.sort((a, b) => b.amountMinor - a.amountMinor);
    return { advances, advanceAccounts, requested, advancedMinor, staffRows, accountRows };
  }, [expenses, accounts]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Expenses · Requests & advances</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Requests & advances</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Money asked and money handed out ahead of spend. An expense is counted as an advance when booked to an
            advance-type account (advances, deposits, floats, prepaids, petty cash, retainers).
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><HandCoins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Recorded expenses</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.requested)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{expenses?.length ?? 0} requests booked</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BanknoteArrowUp size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Advances handed out</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.advancedMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.advances.length} advance transactions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShieldCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Advance accounts</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.advanceAccounts.size}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">recognised in your chart</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Advances by account</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Account names flagged as advance-like</p>
          </header>
          <ul className="mt-4 space-y-3">
            {rows.accountRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No advance activity yet.</p>
            ) : (
              rows.accountRows.map((row) => (
                <li key={row.account} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-pos-ink">{row.account}</span>
                  <span className="shrink-0 text-xs text-pos-ink-faint">{row.count} txns</span>
                  <span className="shrink-0 font-semibold tabular-nums text-pos-ink">{naira(row.amountMinor)}</span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header>
            <h2 className="font-semibold text-pos-ink">Advances by staff</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">What each person took as an advance</p>
          </header>
          <ul className="mt-4 space-y-3">
            {rows.staffRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No staff-attributed advances.</p>
            ) : (
              rows.staffRows.map((row) => (
                <li key={row.staff} className="flex items-center gap-3 text-sm">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-pos-surface-muted text-pos-ink-muted">
                    <UserRound size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-pos-ink">{row.staff}</span>
                  <span className="shrink-0 text-xs text-pos-ink-faint">{row.count} advances</span>
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