"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Scale, Search, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  accountBalance,
  loadAccountingBooks,
  type AccountingBooks,
} from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

export function TrialBalancePage() {
  const [books, setBooks] = useState<AccountingBooks | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAccountingBooks()
      .then(setBooks)
      .catch((err) => {
        toast.error(err, "Could not load accounting books");
        setBooks(null);
      });
  }, []);

  const query = search.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!books) return [];
    return books.accounts
      .map((row) => ({ row, bal: accountBalance(row) }))
      .filter(({ row, bal }) => bal.debitMinor > 0 || bal.creditMinor > 0 || row.type === "equity")
      .filter(({ row }) =>
        query
          ? [row.code, row.name, row.type].some((value) => value.toLowerCase().includes(query))
          : true,
      );
  }, [books, query]);

  if (!books) return <ManagerSkeleton variant="table" />;

  const debitTotal = rows.reduce((sum, row) => sum + row.bal.debitMinor, 0);
  const creditTotal = rows.reduce((sum, row) => sum + row.bal.creditMinor, 0);
  const balanced = debitTotal === creditTotal;
  const difference = Math.abs(debitTotal - creditTotal);

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Account · Statements
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Trial balance</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Debits and credits by account — totals must match before you close the period.
          </p>
        </div>
        <label className="relative min-w-[220px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code, account or type…"
            className={`${fieldClass} w-full rounded-full pl-10 shadow-pos-md`}
          />
        </label>
      </header>

      <section
        className={`mb-5 flex items-center gap-4 rounded-[20px] p-5 shadow-pos-md ${
          balanced
            ? "bg-pos-success-soft"
            : "bg-rose-50 dark:bg-rose-950/30"
        }`}
      >
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
            balanced ? "bg-white text-pos-success" : "bg-white text-pos-danger"
          } shadow-pos-sm`}
        >
          {balanced ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-base font-semibold ${balanced ? "text-pos-success" : "text-pos-danger"}`}>
            {balanced ? "Books are in balance" : "Books are out of balance"}
          </p>
          <p className={`mt-0.5 text-sm ${balanced ? "text-pos-success/80" : "text-pos-danger/80"}`}>
            {balanced
              ? "Total debits equal total credits across all accounts."
              : `Difference of ${naira(difference)} — investigate before closing the period.`}
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-xs uppercase tracking-wide text-pos-ink-faint">Total debits</p>
          <p className="text-lg font-bold tabular-nums text-pos-ink">{naira(debitTotal)}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-pos-ink-faint">Total credits</p>
          <p className="text-lg font-bold tabular-nums text-pos-ink">{naira(creditTotal)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 560 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Account</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Debit</th>
                <th className="px-5 py-3.5 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-pos-ink-faint">
                    <Scale size={28} className="mx-auto mb-2 opacity-40" />
                    {search ? "No accounts matched your search." : "No balances to show yet."}
                  </td>
                </tr>
              ) : (
                rows.map(({ row, bal }) => (
                  <tr key={row.code} className="hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3 font-mono text-xs text-pos-ink-muted">{row.code}</td>
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.name}</td>
                    <td className="px-5 py-3 text-xs capitalize text-pos-ink-faint">{row.type}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                      {naira(bal.debitMinor, 0)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                      {naira(bal.creditMinor, 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                  <td className="px-5 py-3.5" colSpan={3}>
                    Totals
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(debitTotal)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(creditTotal)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}