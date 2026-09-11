"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarRange, ReceiptText } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { EMPTY_LEDGER_FILTERS, applyLedgerFilters, useLedgerEntity, type LedgerFilters } from "./use-ledger";
import { LedgerToolbar } from "./LedgerToolbar";

const DAY = 86_400_000;

function bucketOf(date: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / DAY));
  if (days <= 30) return "current";
  if (days <= 60) return "d31";
  if (days <= 90) return "d61";
  return "d91";
}

export function VendorLedgerPage() {
  const { loaded, lines, stores, statuses, sources, allAccounts } = useLedgerEntity("vendor");
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [selected, setSelected] = useState("");

  const boundedLines = useMemo(() => applyLedgerFilters(lines, { ...filters, name: "" }), [lines, filters]);

  const vendors = useMemo(() => {
    const query = filters.name.trim().toLowerCase();
    const rows = allAccounts.map((name) => {
      const own = boundedLines.filter((line) => line.account === name);
      const buckets = { current: 0, d31: 0, d61: 0, d91: 0, total: 0 };
      for (const line of own) {
        const bucket = bucketOf(line.date);
        buckets[bucket] += line.amountMinor;
        buckets.total += line.amountMinor;
      }
      return { name, count: own.length, buckets };
    });
    const visible = query ? rows.filter((row) => row.name.toLowerCase().includes(query)) : rows;
    return visible.filter((row) => row.count > 0).sort((a, b) => b.buckets.total - a.buckets.total);
  }, [allAccounts, boundedLines, filters.name]);

  useEffect(() => {
    if (loaded && !selected && vendors.length > 0) {
      setSelected(vendors[0].name);
    }
  }, [loaded, selected, vendors]);

  const statement = useMemo(
    () =>
      boundedLines
        .filter((line) => line.account === selected)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [boundedLines, selected],
  );

  if (!loaded) return <ManagerSkeleton variant="table" />;

  const grand = vendors.reduce(
    (sum, row) => ({
      current: sum.current + row.buckets.current,
      d31: sum.d31 + row.buckets.d31,
      d61: sum.d61 + row.buckets.d61,
      d91: sum.d91 + row.buckets.d91,
      total: sum.total + row.buckets.total,
    }),
    { current: 0, d31: 0, d61: 0, d91: 0, total: 0 },
  );
  const overdue = grand.d31 + grand.d61 + grand.d91;
  const oldestDate = boundedLines.length
    ? boundedLines.reduce((a, b) => (a.date < b.date ? a : b)).date
    : null;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Ledger · Vendor
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Vendor ledger</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Purchase invoices shown as an aging matrix — how long each invoice has been open — with a statement for
          every supplier. Search by name, filter by date, status, or source.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Suppliers</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{vendors.length}</p>
          <p className="mt-1 text-sm text-pos-ink-muted">{boundedLines.length} invoices</p>
        </div>
        <div className="rounded-[18px] bg-pos-warning-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-warning">Payable</p>
          <p className="mt-2 text-2xl font-bold text-pos-warning">{naira(grand.total)}</p>
          <p className="mt-1 text-sm text-pos-warning/80">{naira(grand.current)} current</p>
        </div>
        <div className="rounded-[18px] bg-rose-50 p-5 shadow-pos-md dark:bg-rose-950/30">
          <p className="text-[11px] uppercase tracking-wide text-pos-danger">Overdue</p>
          <p className="mt-2 text-2xl font-bold text-pos-danger">{naira(overdue)}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-pos-danger/80">
            <CalendarRange size={12} />
            {oldestDate ? `oldest ${prettyDay(oldestDate)}` : "nothing overdue"}
          </p>
        </div>
      </div>

      <LedgerToolbar
        filters={filters}
        onChange={setFilters}
        stores={stores}
        statuses={statuses}
        sources={sources}
        showStore={false}
      />

      <section className="mb-5 overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 760 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Vendor</th>
                <th className="px-5 py-3.5 text-right">Invoices</th>
                <th className="px-5 py-3.5 text-right">Current</th>
                <th className="px-5 py-3.5 text-right">31–60</th>
                <th className="px-5 py-3.5 text-right">61–90</th>
                <th className="px-5 py-3.5 text-right">90+</th>
                <th className="px-5 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-pos-ink-faint">
                    <Building2 size={28} className="mx-auto mb-2 opacity-40" />
                    No vendors match the active filters.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => {
                  const active = vendor.name === selected;
                  return (
                    <tr
                      key={vendor.name}
                      onClick={() => setSelected(vendor.name)}
                      className={`cursor-pointer transition ${active ? "bg-pos-primary-soft/60" : "hover:bg-pos-surface-muted/40"}`}
                    >
                      <td className="px-5 py-3 font-medium text-pos-ink">
                        <span className="flex items-center gap-2">
                          <Building2 size={14} className={active ? "text-pos-primary" : "text-pos-ink-faint"} />
                          {vendor.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-ink-muted">{vendor.count}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                        {naira(vendor.buckets.current, 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                        {naira(vendor.buckets.d31, 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-ink">
                        {naira(vendor.buckets.d61, 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-pos-danger">
                        {naira(vendor.buckets.d91, 0)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-ink">
                        {naira(vendor.buckets.total, 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {vendors.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                  <td className="px-5 py-3.5" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(grand.current, 0)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(grand.d31, 0)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(grand.d61, 0)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-danger">{naira(grand.d91, 0)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(grand.total, 0)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {selected ? (
        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border px-5 py-4">
            <h2 className="font-semibold text-pos-ink">{selected}</h2>
            <span className="inline-flex rounded-full bg-pos-primary-soft px-2.5 py-1 text-[11px] font-semibold text-pos-primary">
              {naira(statement.reduce((sum, line) => sum + line.amountMinor, 0))}
            </span>
          </header>
          <div className="space-y-2 p-5">
            {statement.length === 0 ? (
              <p className="py-6 text-center text-sm text-pos-ink-faint">
                <ReceiptText size={24} className="mx-auto mb-2 opacity-40" />
                No invoices match the active filters.
              </p>
            ) : (
              statement.map((line) => (
                <div key={line.key} className="flex flex-wrap items-center gap-3 rounded-xl bg-pos-surface-muted/50 px-4 py-2.5">
                  <span className="min-w-[110px] text-xs tabular-nums text-pos-ink-faint">{prettyDay(line.date)}</span>
                  <span className="font-mono text-xs text-pos-ink-muted">{line.ref}</span>
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
                  <span className="ml-auto text-sm font-semibold tabular-nums text-pos-ink">
                    {naira(line.amountMinor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}