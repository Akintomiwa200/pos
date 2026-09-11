"use client";

import { useMemo, useState } from "react";
import { Boxes, ChevronDown, ShoppingBasket, UserRound } from "lucide-react";
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

export function StaffLedgerPage() {
  const { loaded, lines, stores, statuses, sources, allAccounts } = useLedgerEntity("staff");
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [expanded, setExpanded] = useState<string[]>([]);

  const scoped = useMemo(() => applyLedgerFilters(lines, { ...filters, name: "" }), [lines, filters]);

  const staff = useMemo(() => {
    const query = filters.name.trim().toLowerCase();
    const rows = allAccounts
      .filter((name) => !query || name.toLowerCase().includes(query))
      .map((name) => {
        const own = scoped.filter((line) => line.account === name);
        const till = own.filter((line) => line.source === "till");
        const stock = own.filter((line) => line.source === "stock");
        return {
          name,
          count: own.length,
          tillTotal: till.reduce((sum, line) => sum + line.amountMinor, 0),
          tillCount: till.length,
          stockCount: stock.length,
          own,
        };
      });
    return rows.filter((row) => row.count > 0).sort((a, b) => b.tillTotal - a.tillTotal);
  }, [allAccounts, scoped, filters.name]);

  const toggle = (name: string) =>
    setExpanded((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name],
    );

  if (!loaded) return <ManagerSkeleton variant="table" />;

  const tillTotal = scoped
    .filter((line) => line.source === "till")
    .reduce((sum, line) => sum + line.amountMinor, 0);
  const stockCount = scoped.filter((line) => line.source === "stock").length;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Ledger · Staff
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Staff ledger</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          What every staff member touched — till tickets they served and stock they moved. Search by name, filter by
          date, branch, status, or source.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Staff with activity</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{staff.length}</p>
        </div>
        <div className="rounded-[18px] bg-pos-success-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-success">Till sales served</p>
          <p className="mt-2 text-2xl font-bold text-pos-success">{naira(tillTotal)}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Stock movements</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{stockCount}</p>
        </div>
      </div>

      <LedgerToolbar filters={filters} onChange={setFilters} stores={stores} statuses={statuses} sources={sources} />

      {staff.length === 0 ? (
        <section className="rounded-[20px] bg-pos-surface py-16 text-center text-pos-ink-faint shadow-pos-md">
          <UserRound size={30} className="mx-auto mb-3 opacity-40" />
          No staff match the active filters.
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((person) => {
            const isOpen = expanded.includes(person.name);
            return (
              <article key={person.name} className="rounded-[20px] bg-pos-surface shadow-pos-md">
                <button
                  type="button"
                  onClick={() => toggle(person.name)}
                  className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-pos-surface-muted/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-primary-soft text-xs font-bold text-pos-primary">
                    {initials(person.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-pos-ink">{person.name}</span>
                    <span className="mt-0.5 flex items-center gap-3 text-xs text-pos-ink-faint">
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBasket size={12} /> {person.tillCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Boxes size={12} /> {person.stockCount}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-pos-ink">{naira(person.tillTotal)}</span>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 text-pos-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen ? (
                  <div className="overflow-x-auto border-t border-pos-border">
                    <table className="w-full text-left text-sm" style={{ minWidth: 430 }}>
                      <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                        <tr>
                          <th className="px-4 py-2.5">When</th>
                          <th className="px-4 py-2.5">Activity</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pos-border/50">
                        {person.own.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-pos-ink-faint">
                              Nothing matches the active filters.
                            </td>
                          </tr>
                        ) : (
                          person.own.map((line) => (
                            <tr key={line.key} className="hover:bg-pos-surface-muted/40">
                              <td className="whitespace-nowrap px-4 py-2 text-pos-ink-muted">
                                {prettyDay(line.date)}
                              </td>
                              <td className="px-4 py-2">
                                <span className="block text-xs capitalize text-pos-ink-muted">{line.source}</span>
                                <span className="block max-w-[220px] truncate text-pos-ink">
                                  {line.source === "till" ? line.detail : `${line.detail} · ${line.ref}`}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-pos-ink-muted">
                                  {line.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-pos-ink">
                                {line.amountMinor > 0 ? naira(line.amountMinor) : <span className="text-pos-ink-faint">—</span>}
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
          })}
        </section>
      )}
    </div>
  );
}