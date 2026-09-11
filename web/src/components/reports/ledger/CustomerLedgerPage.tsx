"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, UserRound } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { EMPTY_LEDGER_FILTERS, applyLedgerFilters, useLedgerEntity, type LedgerFilters } from "./use-ledger";
import { LedgerToolbar } from "./LedgerToolbar";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CustomerLedgerPage() {
  const { loaded, lines, stores, statuses, sources, allAccounts } = useLedgerEntity("customer");
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [selected, setSelected] = useState("");

  const scoped = useMemo(() => applyLedgerFilters(lines, { ...filters, name: "" }), [lines, filters]);

  const byAccount = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const line of scoped) {
      const row = map.get(line.account) ?? { count: 0, total: 0 };
      row.count += 1;
      row.total += line.amountMinor;
      map.set(line.account, row);
    }
    return map;
  }, [scoped]);

  const accountList = useMemo(() => {
    const query = filters.name.trim().toLowerCase();
    return allAccounts
      .filter((name) => !query || name.toLowerCase().includes(query))
      .map((name) => ({ name, ...(byAccount.get(name) ?? { count: 0, total: 0 }) }))
      .sort((a, b) => b.total - a.total);
  }, [allAccounts, byAccount, filters.name]);

  useEffect(() => {
    if (loaded && !selected && accountList.length > 0) {
      setSelected(accountList[0].name);
    }
  }, [loaded, selected, accountList]);

  const statement = useMemo(() => {
    if (!selected) return [];
    let running = 0;
    return scoped
      .filter((line) => line.account === selected)
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((line) => {
        running += line.amountMinor;
        return { line, running };
      });
  }, [scoped, selected]);

  if (!loaded) return <ManagerSkeleton variant="table" />;

  const totalLines = scoped.length;
  const openQuotes = scoped.filter((line) => line.source === "quote" && line.status !== "cancelled").length;
  const tillLines = scoped.filter((line) => line.source === "till").length;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Ledger · Customer
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Customer ledger</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Every quote, invoice, and till ticket recorded against a customer, drawn oldest to newest with a running
          total. Search by name and filter by date, branch, status, or source.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Accounts</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{accountList.length}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Ledger lines</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{totalLines}</p>
          <p className="mt-1 text-sm text-pos-ink-muted">{tillLines} from the till</p>
        </div>
        <div className="rounded-[18px] bg-pos-warning-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-warning">Open quotes</p>
          <p className="mt-2 text-2xl font-bold text-pos-warning">{openQuotes}</p>
        </div>
      </div>

      <LedgerToolbar
        filters={filters}
        onChange={setFilters}
        stores={stores}
        statuses={statuses}
        sources={sources}
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="h-max overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="border-b border-pos-border px-4 py-3">
            <p className="text-sm font-semibold text-pos-ink">Accounts</p>
            <p className="text-xs text-pos-ink-faint">
              {accountList.length} of {allAccounts.length} match
            </p>
          </header>
          <div className="max-h-[560px] overflow-y-auto">
            {accountList.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-pos-ink-faint">No accounts on file.</p>
            ) : (
              accountList.map((account) => {
                const active = account.name === selected;
                return (
                  <button
                    key={account.name}
                    type="button"
                    onClick={() => setSelected(account.name)}
                    className={`flex w-full items-center gap-3 border-b border-pos-border/40 px-4 py-3 text-left transition ${
                      active ? "bg-pos-primary text-white" : "hover:bg-pos-surface-muted"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        active ? "bg-white/20 text-white" : "bg-pos-primary-soft text-pos-primary"
                      }`}
                    >
                      {initials(account.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-medium ${active ? "text-white" : "text-pos-ink"}`}>
                        {account.name}
                      </span>
                      <span className={`block text-xs ${active ? "text-white/70" : "text-pos-ink-faint"}`}>
                        {account.count} line{account.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className={`text-sm font-semibold tabular-nums ${active ? "text-white" : "text-pos-ink"}`}>
                      {naira(account.total)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-pos-ink">
                <UserRound size={16} className="text-pos-primary" />
                {selected || "Choose an account"}
              </h2>
              <p className="mt-0.5 text-xs text-pos-ink-faint">
                {statement.length} entries · running from the first recorded document
              </p>
            </div>
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected("")}
                className="rounded-full bg-pos-surface-muted px-3 py-1.5 text-xs font-medium text-pos-ink-muted hover:text-pos-ink"
              >
                Clear
              </button>
            ) : null}
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ minWidth: 620 }}>
              <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                <tr>
                  <th className="px-5 py-3.5">When</th>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Value</th>
                  <th className="px-5 py-3.5 text-right">Running total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/50">
                {!selected ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                      <FileText size={28} className="mx-auto mb-2 opacity-40" />
                      Pick an account on the left to draw its ledger.
                    </td>
                  </tr>
                ) : statement.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                      No ledger lines match the active filters.
                    </td>
                  </tr>
                ) : (
                  statement.map(({ line, running }) => (
                    <tr key={line.key} className="hover:bg-pos-surface-muted/40">
                      <td className="whitespace-nowrap px-5 py-3">{prettyDay(line.date)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-pos-ink-muted">{line.ref}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-pos-ink-muted">
                          {line.source}
                          {line.store ? ` · ${line.store}` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                            line.status === "cancelled"
                              ? "bg-pos-surface-muted text-pos-ink-faint"
                              : line.status === "closed"
                                ? "bg-pos-success-soft text-pos-success"
                                : "bg-pos-warning-soft text-pos-warning"
                          }`}
                        >
                          {line.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-ink">{naira(line.amountMinor)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-ink">
                        {naira(running)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {statement.length > 0 ? (
                <tfoot>
                  <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                    <td className="px-5 py-3.5" colSpan={5}>
                      Balance
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">
                      {naira(statement[statement.length - 1].running)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}