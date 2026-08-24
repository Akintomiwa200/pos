"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import {
  accountBalance,
  formatAccountMoney,
  loadAccountingBooks,
  type AccountingBooks,
  type AccountType,
} from "@/lib/hq-accounting";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell, Toolbar } from "../console/Chrome";

export type AccountingVariant =
  | "chart-of-accounts"
  | "journal"
  | "trial-balance"
  | "profit-loss"
  | "balance-sheet"
  | "cash-book";

const HEADERS: Record<AccountingVariant, { kicker: string; title: string; copy: string }> = {
  "chart-of-accounts": {
    kicker: "Account · Books",
    title: "Chart of accounts",
    copy: "Control accounts for cash, stock, receivables, payables, VAT, sales, and expenses.",
  },
  journal: {
    kicker: "Account · Books",
    title: "Journal",
    copy: "Auto-posted entries from POS sales, purchase invoices, and expenses.",
  },
  "trial-balance": {
    kicker: "Account · Statements",
    title: "Trial balance",
    copy: "Debits and credits by account — totals must match before you close the period.",
  },
  "profit-loss": {
    kicker: "Account · Statements",
    title: "Profit & loss",
    copy: "Income statement from till sales, cost of sales, and operating expenses.",
  },
  "balance-sheet": {
    kicker: "Account · Statements",
    title: "Balance sheet",
    copy: "Assets, liabilities, and equity snapshot derived from live HQ books.",
  },
  "cash-book": {
    kicker: "Account · Books",
    title: "Cash book",
    copy: "Money in from tenders and money out for expenses, with running cash position.",
  },
};

const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

export function AccountingReports({ variant }: { variant: AccountingVariant }) {
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

  const header = HEADERS[variant];
  const query = search.trim().toLowerCase();

  const trialRows = useMemo(() => {
    if (!books) return [];
    return books.accounts
      .map((row) => ({ row, bal: accountBalance(row) }))
      .filter(({ row, bal }) => bal.debitMinor > 0 || bal.creditMinor > 0 || row.type === "equity")
      .filter(({ row }) =>
        query
          ? [row.code, row.name, TYPE_LABEL[row.type]].some((value) =>
              value.toLowerCase().includes(query),
            )
          : true,
      );
  }, [books, query]);

  if (!books) return <ManagerSkeleton variant="table" />;

  if (variant === "chart-of-accounts") {
    const rows = books.accounts.filter((row) =>
      query
        ? [row.code, row.name, TYPE_LABEL[row.type]].some((value) => value.toLowerCase().includes(query))
        : true,
    );
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Accounts" value={String(books.accounts.length)} />
          <StatCard label="Assets on books" value={naira(books.cashMinor + books.inventoryValueMinor + books.receivablesMinor, 0)} />
          <StatCard label="Expense codes" value={String(books.accounts.filter((a) => a.type === "expense").length)} />
        </div>
        <TableShell
          columns={["Code", "Account", "Type", "Debits", "Credits"]}
          toolbar={<Toolbar search={search} onSearch={setSearch} />}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} message="No accounts matched." />
          ) : (
            rows.map((row) => (
              <tr key={row.code} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.code}</td>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{TYPE_LABEL[row.type]}</td>
                <td className="px-4 py-3 tabular-nums">{formatAccountMoney(row.debitMinor)}</td>
                <td className="px-4 py-3 tabular-nums">{formatAccountMoney(row.creditMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "trial-balance") {
    const debitTotal = trialRows.reduce((sum, row) => sum + row.bal.debitMinor, 0);
    const creditTotal = trialRows.reduce((sum, row) => sum + row.bal.creditMinor, 0);
    const balanced = debitTotal === creditTotal;
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total debits" value={naira(debitTotal)} />
          <StatCard label="Total credits" value={naira(creditTotal)} />
          <StatCard
            label="Status"
            value={balanced ? "Balanced" : "Out of balance"}
            hint={balanced ? "Debits equal credits" : `Difference ${naira(Math.abs(debitTotal - creditTotal))}`}
          />
        </div>
        <TableShell
          columns={["Code", "Account", "Debit", "Credit"]}
          toolbar={<Toolbar search={search} onSearch={setSearch} />}
        >
          {trialRows.length === 0 ? (
            <EmptyRow colSpan={4} message="No balances to show yet." />
          ) : (
            <>
              {trialRows.map(({ row, bal }) => (
                <tr key={row.code} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.code}</td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 tabular-nums">{formatAccountMoney(bal.debitMinor)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatAccountMoney(bal.creditMinor)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-pos-border bg-pos-surface-muted font-semibold">
                <td className="px-4 py-3" colSpan={2}>
                  Totals
                </td>
                <td className="px-4 py-3 tabular-nums">{naira(debitTotal)}</td>
                <td className="px-4 py-3 tabular-nums">{naira(creditTotal)}</td>
              </tr>
            </>
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "profit-loss") {
    const income = books.accounts.filter((row) => row.type === "income");
    const expenses = books.accounts.filter((row) => row.type === "expense");
    const incomeTotal = income.reduce((sum, row) => sum + Math.max(0, row.creditMinor - row.debitMinor), 0);
    const expenseTotal = expenses.reduce((sum, row) => sum + Math.max(0, row.debitMinor - row.creditMinor), 0);
    const net = incomeTotal - expenseTotal;
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Revenue" value={naira(incomeTotal)} />
          <StatCard label="Expenses & COGS" value={naira(expenseTotal)} />
          <StatCard
            label="Net profit / (loss)"
            value={naira(net)}
            hint={net >= 0 ? "In the black" : "In the red"}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TableShell columns={["Income", "Amount"]}>
            {income.length === 0 ? (
              <EmptyRow colSpan={2} message="No income posted." />
            ) : (
              income.map((row) => (
                <tr key={row.code} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">
                    <span className="mr-2 font-mono text-xs text-pos-ink-faint">{row.code}</span>
                    {row.name}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {naira(Math.max(0, row.creditMinor - row.debitMinor))}
                  </td>
                </tr>
              ))
            )}
          </TableShell>
          <TableShell columns={["Expense", "Amount"]}>
            {expenses.length === 0 ? (
              <EmptyRow colSpan={2} message="No expenses posted." />
            ) : (
              expenses.map((row) => (
                <tr key={row.code} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">
                    <span className="mr-2 font-mono text-xs text-pos-ink-faint">{row.code}</span>
                    {row.name}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {naira(Math.max(0, row.debitMinor - row.creditMinor))}
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </div>
      </div>
    );
  }

  if (variant === "balance-sheet") {
    const assets = books.accounts.filter((row) => row.type === "asset");
    const liabilities = books.accounts.filter((row) => row.type === "liability");
    const equity = books.accounts.filter((row) => row.type === "equity");
    const assetTotal = assets.reduce((sum, row) => sum + Math.max(0, row.debitMinor - row.creditMinor), 0);
    const liabilityTotal = liabilities.reduce(
      (sum, row) => sum + Math.max(0, row.creditMinor - row.debitMinor),
      0,
    );
    const equityTotal = equity.reduce((sum, row) => sum + Math.max(0, row.creditMinor - row.debitMinor), 0);
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Assets" value={naira(assetTotal)} />
          <StatCard label="Liabilities" value={naira(liabilityTotal)} />
          <StatCard label="Equity" value={naira(equityTotal)} hint="Assets − liabilities" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "Assets", rows: assets, side: "debit" as const },
            { title: "Liabilities", rows: liabilities, side: "credit" as const },
            { title: "Equity", rows: equity, side: "credit" as const },
          ].map((section) => (
            <TableShell key={section.title} columns={[section.title, "Amount"]}>
              {section.rows.length === 0 ? (
                <EmptyRow colSpan={2} message="None." />
              ) : (
                section.rows.map((row) => {
                  const amount =
                    section.side === "debit"
                      ? Math.max(0, row.debitMinor - row.creditMinor)
                      : Math.max(0, row.creditMinor - row.debitMinor);
                  return (
                    <tr key={row.code} className="border-b border-pos-border/60">
                      <td className="px-4 py-3 font-medium">
                        <span className="mr-2 font-mono text-xs text-pos-ink-faint">{row.code}</span>
                        {row.name}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{naira(amount)}</td>
                    </tr>
                  );
                })
              )}
            </TableShell>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cash-book") {
    const rows = books.cashMovements.filter((row) =>
      query
        ? [row.tender, row.memo].some((value) => value.toLowerCase().includes(query))
        : true,
    );
    const inTotal = rows.reduce((sum, row) => sum + row.inMinor, 0);
    const outTotal = rows.reduce((sum, row) => sum + row.outMinor, 0);
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Cash in" value={naira(inTotal)} />
          <StatCard label="Cash out" value={naira(outTotal)} />
          <StatCard label="Net movement" value={naira(inTotal - outTotal)} />
        </div>
        <TableShell
          columns={["When", "Tender", "Detail", "In", "Out"]}
          toolbar={<Toolbar search={search} onSearch={setSearch} />}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} message="No cash movements yet." />
          ) : (
            rows.slice(0, 300).map((row) => (
              <tr key={row.id} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3">
                  {prettyDay(row.at.slice(0, 10))} ·{" "}
                  {new Date(row.at).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 capitalize">{row.tender}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{row.memo}</td>
                <td className="px-4 py-3 tabular-nums text-pos-success">
                  {formatAccountMoney(row.inMinor)}
                </td>
                <td className="px-4 py-3 tabular-nums text-pos-danger">
                  {formatAccountMoney(row.outMinor)}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  // journal
  const journals = books.journals.filter((entry) =>
    query
      ? [entry.ref, entry.memo, entry.source].some((value) => value.toLowerCase().includes(query))
      : true,
  );
  return (
    <div>
      <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Entries" value={String(books.journals.length)} />
        <StatCard label="Sales posts" value={String(books.journals.filter((j) => j.source === "sale").length)} />
        <StatCard label="Expense posts" value={String(books.journals.filter((j) => j.source === "expense").length)} />
      </div>
      <TableShell
        columns={["When", "Ref", "Memo", "Debit", "Credit"]}
        toolbar={<Toolbar search={search} onSearch={setSearch} />}
      >
        {journals.length === 0 ? (
          <EmptyRow colSpan={5} message="No journal entries yet." />
        ) : (
          journals.slice(0, 200).flatMap((entry) =>
            entry.lines.map((line, index) => (
              <tr key={`${entry.id}-${index}`} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3">
                  {index === 0 ? prettyDay(entry.at.slice(0, 10)) : ""}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">
                  {index === 0 ? entry.ref : ""}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{line.accountName}</span>
                  {index === 0 ? (
                    <span className="mt-0.5 block text-xs text-pos-ink-faint">{entry.memo}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatAccountMoney(line.debitMinor)}</td>
                <td className="px-4 py-3 tabular-nums">{formatAccountMoney(line.creditMinor)}</td>
              </tr>
            )),
          )
        )}
      </TableShell>
    </div>
  );
}
