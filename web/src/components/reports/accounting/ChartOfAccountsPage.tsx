"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, BookType, Landmark, Package, Receipt, Scale, Search, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import { loadAccountingBooks, type AccountType, type AccountingBooks } from "@/lib/hq-accounting";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

const TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

const TYPE_STYLE: Record<
  AccountType,
  { label: string; icon: typeof Wallet; tone: string; badge: string }
> = {
  asset: {
    label: "Assets",
    icon: Wallet,
    tone: "text-sky-600 dark:text-sky-300",
    badge: "bg-sky-50 dark:bg-sky-950/40",
  },
  liability: {
    label: "Liabilities",
    icon: Scale,
    tone: "text-pos-danger",
    badge: "bg-rose-50 dark:bg-rose-950/40",
  },
  equity: {
    label: "Equity",
    icon: Landmark,
    tone: "text-pos-primary",
    badge: "bg-pos-primary-soft",
  },
  income: {
    label: "Income",
    icon: Receipt,
    tone: "text-pos-success",
    badge: "bg-pos-success-soft",
  },
  expense: {
    label: "Expenses",
    icon: Banknote,
    tone: "text-pos-warning",
    badge: "bg-amber-50 dark:bg-amber-950/40",
  },
};

export function ChartOfAccountsPage() {
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

  const filtered = useMemo(() => {
    if (!books) return [];
    return books.accounts.filter((row) =>
      query
        ? [row.code, row.name, TYPE_STYLE[row.type].label].some((value) =>
            value.toLowerCase().includes(query),
          )
        : true,
    );
  }, [books, query]);

  if (!books) return <ManagerSkeleton variant="table" />;

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    ...TYPE_STYLE[type],
    rows: filtered.filter((row) => row.type === type),
  })).filter((group) => group.rows.length > 0);

  const assetsOnBooks = books.cashMinor + books.inventoryValueMinor + books.receivablesMinor;

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Account · Books
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Chart of accounts</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Control accounts for cash, stock, receivables, payables, VAT, sales, and expenses.
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
            placeholder="Search code or account…"
            className={`${fieldClass} w-full rounded-full pl-10 shadow-pos-md`}
          />
        </label>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
            <BookType size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Accounts</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">{books.accounts.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Assets on books</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">{naira(assetsOnBooks, 0)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-amber-50 text-pos-warning dark:bg-amber-950/40">
            <Banknote size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Expense codes</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">
              {books.accounts.filter((a) => a.type === "expense").length}
            </p>
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
          <Search size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-faint">No accounts matched your search.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => {
            const Icon = group.icon;
            const groupDebit = group.rows.reduce((sum, row) => sum + row.debitMinor, 0);
            const groupCredit = group.rows.reduce((sum, row) => sum + row.creditMinor, 0);
            return (
              <section
                key={group.type}
                className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md"
              >
                <header className="flex items-center gap-3 border-b border-pos-border px-5 py-3.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${group.badge} ${group.tone}`}>
                    <Icon size={16} />
                  </span>
                  <h2 className="font-semibold text-pos-ink">{group.label}</h2>
                  <span className="text-xs text-pos-ink-faint">{group.rows.length} accounts</span>
                  <span className="ml-auto text-xs tabular-nums text-pos-ink-faint">
                    Dr {naira(groupDebit, 0)} · Cr {naira(groupCredit, 0)}
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" style={{ minWidth: 560 }}>
                    <thead className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                      <tr>
                        <th className="px-5 py-2.5">Code</th>
                        <th className="px-5 py-2.5">Account</th>
                        <th className="px-5 py-2.5">Type</th>
                        <th className="px-5 py-2.5 text-right">Debits</th>
                        <th className="px-5 py-2.5 text-right">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pos-border/40">
                      {group.rows.map((row) => (
                        <tr key={row.code} className="hover:bg-pos-surface-muted/40">
                          <td className="px-5 py-3 font-mono text-xs text-pos-ink-muted">{row.code}</td>
                          <td className="px-5 py-3 font-medium text-pos-ink">{row.name}</td>
                          <td className={`px-5 py-3 text-xs font-medium capitalize ${group.tone}`}>{group.type}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-pos-ink">{naira(row.debitMinor, 0)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-pos-ink">{naira(row.creditMinor, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-pos-ink-faint">
        Books loaded live · expenses posted as of {prettyDay(new Date().toISOString().slice(0, 10))}
      </p>
    </div>
  );
}