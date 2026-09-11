"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Landmark, Layers, Quote, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "@/lib/toast";
import { loadAccountingBooks, type AccountingBooks } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { compactMinor, useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function ProfitLossPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [books, setBooks] = useState<AccountingBooks | null>(null);

  useEffect(() => {
    loadAccountingBooks()
      .then(setBooks)
      .catch((err) => {
        toast.error(err, "Could not load accounting books");
        setBooks(null);
      });
  }, []);

  const model = useMemo(() => {
    if (!books) return null;
    const revenue = books.accounts
      .filter((row) => row.type === "income")
      .reduce((sum, row) => sum + Math.max(0, row.creditMinor - row.debitMinor), 0);
    const cogs = books.accounts
      .filter((row) => row.code.startsWith("5"))
      .reduce((sum, row) => sum + Math.max(0, row.debitMinor - row.creditMinor), 0);
    const expenses = books.accounts
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + Math.max(0, row.debitMinor - row.creditMinor), 0);
    const gross = revenue - cogs;
    const net = gross - expenses;
    return { revenue, cogs, expenses, gross, net };
  }, [books]);

  if (!books || !model) return <ManagerSkeleton variant="table" />;

  const { revenue, cogs, expenses, gross, net } = model;

  const waterfall = [
    { name: "Revenue", base: 0, move: revenue },
    { name: "COGS", base: gross, move: -cogs },
    { name: "Gross profit", base: net, move: gross },
    { name: "Expenses", base: net, move: -expenses },
    { name: "Net profit", base: 0, move: net },
  ];

  const incomeRows = books.accounts
    .filter((row) => row.type === "income" && row.creditMinor - row.debitMinor > 0)
    .sort((a, b) => b.creditMinor - a.creditMinor);
  const expenseRows = books.accounts
    .filter((row) => row.type === "expense" && row.debitMinor - row.creditMinor > 0)
    .sort((a, b) => b.debitMinor - a.debitMinor);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Account · Statements
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Profit &amp; loss</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Income statement from till sales, cost of sales, and operating expenses.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-pos-success" />
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Revenue</p>
          </div>
          <p className="mt-2 truncate text-2xl font-bold tabular-nums text-pos-ink">{naira(revenue)}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-pos-warning" />
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Cost of sales</p>
          </div>
          <p className="mt-2 truncate text-2xl font-bold tabular-nums text-pos-ink">{naira(cogs)}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <div className="flex items-center gap-2">
            <Quote size={15} className="text-pos-warning" />
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Operating expenses</p>
          </div>
          <p className="mt-2 truncate text-2xl font-bold tabular-nums text-pos-ink">{naira(expenses)}</p>
        </div>
        <div
          className={`rounded-[18px] p-5 shadow-pos-md ${
            net >= 0 ? "bg-pos-success-soft" : "bg-rose-50 dark:bg-rose-950/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <Landmark size={15} className={net >= 0 ? "text-pos-success" : "text-pos-danger"} />
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">
              {net >= 0 ? "Net profit" : "Net loss"}
            </p>
          </div>
          <p
            className={`mt-2 truncate text-2xl font-bold tabular-nums ${
              net >= 0 ? "text-pos-success" : "text-pos-danger"
            }`}
          >
            {naira(net)}
          </p>
        </div>
      </div>

      <section className="mb-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Waterfall</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Revenue → COGS → gross → expenses → net</p>
        </header>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfall} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={colors.inkFaint} fontSize={11} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                stroke={colors.inkFaint}
                fontSize={11}
                tickFormatter={(v: number) => compactMinor(v)}
              />
              <Tooltip
                formatter={(value, name) => [
                  naira(Number(value)),
                  name === "move" ? "" : "",
                ]}
                contentStyle={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  color: colors.ink,
                }}
              />
              <Bar dataKey="base" stackId="water" fill="transparent" />
              <Bar dataKey="move" stackId="water" barSize={52}>
                {waterfall.map((entry) => (
                  <Cell key={entry.name} fill={entry.move >= 0 ? colors.success : colors.danger} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="border-b border-pos-border px-5 py-4">
            <h2 className="font-semibold text-pos-ink">Income</h2>
            <p className="mt-0.5 text-xs text-pos-ink-faint">{incomeRows.length} accounts</p>
          </header>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-pos-border/50">
              {incomeRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-pos-ink-faint">No income posted.</td>
                </tr>
              ) : (
                incomeRows.map((row) => (
                  <tr key={row.code} className="hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3 font-mono text-xs text-pos-ink-faint">{row.code}</td>
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.name}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-ink">
                      {naira(Math.max(0, row.creditMinor - row.debitMinor))}
                    </td>
                  </tr>
                ))
              )}
              {incomeRows.length > 0 ? (
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                  <td className="px-5 py-3" colSpan={2}>
                    Total revenue
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-pos-ink">{naira(revenue)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="border-b border-pos-border px-5 py-4">
            <h2 className="font-semibold text-pos-ink">Expenses</h2>
            <p className="mt-0.5 text-xs text-pos-ink-faint">
              {expenseRows.length} accounts · includes cost of sales
            </p>
          </header>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-pos-border/50">
              {expenseRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-pos-ink-faint">No expenses posted.</td>
                </tr>
              ) : (
                expenseRows.map((row) => (
                  <tr key={row.code} className="hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3 font-mono text-xs text-pos-ink-faint">{row.code}</td>
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                      <span className="text-pos-ink-faint">(</span>
                      {naira(Math.max(0, row.debitMinor - row.creditMinor))}
                      <span className="text-pos-ink-faint">)</span>
                    </td>
                  </tr>
                ))
              )}
              {expenseRows.length > 0 ? (
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                  <td className="px-5 py-3" colSpan={2}>
                    Total expenses
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-pos-danger">
                    {naira(cogs + expenses)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-pos-primary p-5 text-white shadow-pos-primary">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">Bottom line</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{naira(net)}</p>
        </div>
        <p className="text-sm text-white/75">
          {net >= 0
            ? `${gross > 0 ? Math.round((net / gross) * 100) : 0}% net margin on gross profit`
            : "Operating at a loss — examine expenses and unit economics"}
          <span className="ml-2 inline-flex items-center gap-1">
            {net >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          </span>
        </p>
      </section>
    </div>
  );
}