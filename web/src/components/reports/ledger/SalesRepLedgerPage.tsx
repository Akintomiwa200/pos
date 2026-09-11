"use client";

import { useMemo, useState } from "react";
import { ChevronDown, IdCard } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { EMPTY_LEDGER_FILTERS, applyLedgerFilters, useLedgerEntity, type LedgerFilters } from "./use-ledger";
import { LedgerToolbar } from "./LedgerToolbar";

function rankTone(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  if (rank === 2) return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  if (rank === 3) return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
  return "bg-pos-surface-muted text-pos-ink-faint";
}

export function SalesRepLedgerPage() {
  const { loaded, lines, statuses, sources, allAccounts } = useLedgerEntity("sales-representative");
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [expanded, setExpanded] = useState<string[]>([]);

  const scoped = useMemo(() => applyLedgerFilters(lines, filters), [lines, filters]);

  const reps = useMemo(() => {
    const query = filters.name.trim().toLowerCase();
    const rows = allAccounts
      .filter((name) => !query || name.toLowerCase().includes(query))
      .map((name) => {
        const own = scoped.filter((line) => line.account === name);
        return {
          name,
          count: own.length,
          total: own.reduce((sum, line) => sum + line.amountMinor, 0),
          open: own
            .filter((line) => ["open", "received"].includes(line.status))
            .reduce((sum, line) => sum + line.amountMinor, 0),
          own,
        };
      });
    return rows.filter((row) => row.count > 0).sort((a, b) => b.total - a.total);
  }, [allAccounts, scoped, filters.name]);

  const toggle = (name: string) =>
    setExpanded((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name],
    );

  if (!loaded) return <ManagerSkeleton variant="table" />;

  const quotedLines = scoped.filter((line) => line.source === "quote").reduce((sum, line) => sum + line.amountMinor, 0);
  const openTotal = scoped
    .filter((line) => ["open", "received"].includes(line.status))
    .reduce((sum, line) => sum + line.amountMinor, 0);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Ledger · Sales Representative
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Sales representative ledger</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Representatives ranked by the documents against their name, each expandable to its full ledger. Search by
          name, filter by date, status, or source.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Representatives</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{reps.length}</p>
          <p className="mt-1 text-sm text-pos-ink-muted">with documented activity</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Documented value</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(quotedLines)}</p>
          <p className="mt-1 text-sm text-pos-ink-muted">quotes + invoices</p>
        </div>
        <div className="rounded-[18px] bg-pos-warning-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-warning">Open pipeline</p>
          <p className="mt-2 text-2xl font-bold text-pos-warning">{naira(openTotal)}</p>
        </div>
      </div>

      <LedgerToolbar
        filters={filters}
        onChange={setFilters}
        stores={[]}
        statuses={statuses}
        sources={sources}
        showStore={false}
      />

      <section className="space-y-3">
        {reps.length === 0 ? (
          <div className="rounded-[20px] bg-pos-surface py-16 text-center text-pos-ink-faint shadow-pos-md">
            <IdCard size={30} className="mx-auto mb-3 opacity-40" />
            No representatives match the active filters.
          </div>
        ) : (
          reps.map((rep, index) => {
            const isOpen = expanded.includes(rep.name);
            return (
              <article key={rep.name} className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
                <button
                  type="button"
                  onClick={() => toggle(rep.name)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-pos-surface-muted/40"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${rankTone(index + 1)}`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-pos-ink">{rep.name}</span>
                    <span className="block text-xs text-pos-ink-faint">
                      {rep.count} document{rep.count === 1 ? "" : "s"} · {naira(rep.open)} open
                    </span>
                  </span>
                  <span className="hidden text-sm font-semibold tabular-nums text-pos-ink sm:block">
                    {naira(rep.total)}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-pos-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen ? (
                  <div className="overflow-x-auto border-t border-pos-border">
                    <table className="w-full text-left text-sm" style={{ minWidth: 560 }}>
                      <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                        <tr>
                          <th className="px-5 py-3">When</th>
                          <th className="px-5 py-3">Reference</th>
                          <th className="px-5 py-3">Source</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pos-border/50">
                        {rep.own.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-pos-ink-faint">
                              Nothing matches the active filters.
                            </td>
                          </tr>
                        ) : (
                          rep.own.map((line) => (
                            <tr key={line.key} className="hover:bg-pos-surface-muted/40">
                              <td className="whitespace-nowrap px-5 py-2.5">{prettyDay(line.date)}</td>
                              <td className="px-5 py-2.5 font-mono text-xs text-pos-ink-muted">{line.ref}</td>
                              <td className="px-5 py-2.5 text-xs capitalize text-pos-ink-muted">{line.source}</td>
                              <td className="px-5 py-2.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
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
                              <td className="px-5 py-2.5 text-right tabular-nums text-pos-ink">
                                {naira(line.amountMinor)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}