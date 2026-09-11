"use client";

import { useEffect, useMemo, useState } from "react";
import { Equal, Landmark, Scale, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import { loadAccountingBooks, type AccountingBooks } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

export function BalanceSheetPage() {
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
    const assets = books.accounts
      .filter((row) => row.type === "asset")
      .reduce((sum, row) => sum + Math.max(0, row.debitMinor - row.creditMinor), 0);
    const liabilities = books.accounts
      .filter((row) => row.type === "liability")
      .reduce((sum, row) => sum + Math.max(0, row.creditMinor - row.debitMinor), 0);
    const equity = books.accounts
      .filter((row) => row.type === "equity")
      .reduce((sum, row) => sum + Math.max(0, row.creditMinor - row.debitMinor), 0);
    return { assets, liabilities, equity };
  }, [books]);

  if (!books || !model) return <ManagerSkeleton variant="table" />;

  const { assets, liabilities, equity } = model;
  const reconciles = assets === liabilities + equity;

  const sections = [
    {
      key: "asset" as const,
      title: "Assets",
      icon: Wallet,
      tone: "text-sky-600 dark:text-sky-300",
      badge: "bg-sky-50 dark:bg-sky-950/40",
      rows: books.accounts.filter((row) => row.type === "asset" && row.debitMinor - row.creditMinor > 0),
      total: assets,
      side: "debit" as const,
    },
    {
      key: "liability" as const,
      title: "Liabilities",
      icon: Scale,
      tone: "text-pos-danger",
      badge: "bg-rose-50 dark:bg-rose-950/40",
      rows: books.accounts.filter((row) => row.type === "liability" && row.creditMinor - row.debitMinor > 0),
      total: liabilities,
      side: "credit" as const,
    },
    {
      key: "equity" as const,
      title: "Equity",
      icon: Landmark,
      tone: "text-pos-primary",
      badge: "bg-pos-primary-soft",
      rows: books.accounts.filter((row) => row.type === "equity" && row.creditMinor - row.debitMinor > 0),
      total: equity,
      side: "credit" as const,
    },
  ];

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Account · Statements
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Balance sheet</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Assets, liabilities, and equity snapshot derived from live HQ books.
        </p>
      </header>

      <section
        className={`mb-5 flex flex-col items-center gap-2 rounded-[24px] p-6 text-center shadow-pos-md sm:flex-row sm:justify-between ${
          reconciles
            ? "bg-pos-success-soft"
            : "bg-rose-50 dark:bg-rose-950/30"
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-2xl font-bold tabular-nums">
          <span className="rounded-2xl bg-white px-4 py-2 text-pos-ink shadow-pos-sm">{naira(assets)}</span>
          <Equal size={20} className={reconciles ? "text-pos-success" : "text-pos-danger"} />
          <span className="rounded-2xl bg-white px-4 py-2 text-pos-ink shadow-pos-sm">{naira(liabilities)}</span>
          <span className="text-pos-ink-faint">+</span>
          <span className="rounded-2xl bg-white px-4 py-2 text-pos-ink shadow-pos-sm">{naira(equity)}</span>
        </div>
        <p
          className={`text-sm font-medium ${
            reconciles ? "text-pos-success" : "text-pos-danger"
          }`}
        >
          {reconciles
            ? "A = L + E — the sheet balances"
            : `Difference ${naira(Math.abs(assets - liabilities - equity))} — mixed-sign sections hidden`}
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.key} className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
              <header className={`border-b border-pos-border px-5 py-4 ${section.badge}`}>
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-pos-ink">
                    <Icon size={16} className={section.tone} /> {section.title}
                  </h2>
                  <p className="text-lg font-bold tabular-nums text-pos-ink">{naira(section.total)}</p>
                </div>
                <p className={`mt-1 text-xs ${section.tone}`}>{section.rows.length} accounts</p>
              </header>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-pos-border/50">
                  {section.rows.length === 0 ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-pos-ink-faint">None.</td>
                    </tr>
                  ) : (
                    section.rows.map((row) => (
                      <tr key={row.code} className="hover:bg-pos-surface-muted/40">
                        <td className="px-5 py-3 font-mono text-xs text-pos-ink-faint">{row.code}</td>
                        <td className="px-5 py-3 font-medium text-pos-ink">{row.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                          {naira(
                            section.side === "debit"
                              ? Math.max(0, row.debitMinor - row.creditMinor)
                              : Math.max(0, row.creditMinor - row.debitMinor),
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {section.rows.length > 0 ? (
                  <tfoot>
                    <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                      <td className="px-5 py-3" colSpan={2}>
                        Total {section.title.toLowerCase()}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-ink">{naira(section.total)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}