"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Landmark, LineChart } from "lucide-react";
import { loadAccountingBooks } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

type Books = Awaited<ReturnType<typeof loadAccountingBooks>>;

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CashflowStatementPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [books, setBooks] = useState<Books | null>(null);

  useEffect(() => {
    loadAccountingBooks()
      .then(setBooks)
      .catch(() => setBooks(null));
  }, []);

  const rows = useMemo(() => {
    if (!books) return null;
    const months = new Map<string, { inMinor: number; outMinor: number; count: number }>();
    for (const move of books.cashMovements) {
      const key = monthKey(move.at);
      const row = months.get(key) ?? { inMinor: 0, outMinor: 0, count: 0 };
      row.inMinor += move.inMinor;
      row.outMinor += move.outMinor;
      row.count += 1;
      months.set(key, row);
    }
    const sorted = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const lines = sorted.map(([month, row]) => ({
      month,
      inMinor: row.inMinor,
      outMinor: row.outMinor,
      netMinor: row.inMinor - row.outMinor,
      count: row.count,
    }));
    const totalIn = lines.reduce((sum, row) => sum + row.inMinor, 0);
    const totalOut = lines.reduce((sum, row) => sum + row.outMinor, 0);
    const net = totalIn - totalOut;
    return { lines, totalIn, totalOut, net, opening: books.cashMinor };
  }, [books]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Financial · Cashflow statement</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Cashflow statement</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Direct-method cashflow from the till: receipts from sales in, payments to expenses out, month by month.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Landmark size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Cash receipts</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalIn)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">from settled sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ArrowUpFromLine size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Cash payments</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalOut)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">on expenses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><LineChart size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Net cashflow</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight" style={{ color: rows.net >= 0 ? "#6ee7b7" : "#fca5a5" }}>
                  {naira(rows.net)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {rows.lines.length} month{rows.lines.length === 1 ? "" : "s"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Direct-method cashflow</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Operating activities only — investing and financing are not separately tracked in the till data set.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No cash movements yet — settle a sale or book an expense to populate this statement.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Month</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Receipts</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Payments</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Net</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Closing position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {(() => {
                    const builder: Array<{ month: string; inMinor: number; outMinor: number; netMinor: number; balanceMinor: number }> = [];
                    let running = 0;
                    for (const row of rows.lines) {
                      running += row.netMinor;
                      builder.push({ ...row, balanceMinor: running });
                    }
                    return builder.map((row) => (
                      <tr key={row.month}>
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.month}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.inMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(row.outMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">
                          {row.netMinor > 0 ? <span className="text-emerald-600 dark:text-emerald-400">+{naira(row.netMinor)}</span> : naira(row.netMinor)}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums" style={{ color: colors.primary }}>
                          {naira(row.balanceMinor)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}