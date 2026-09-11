"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, Percent, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay, taxSummary, type TaxSummary } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function TaxDetailPage() {
  const [data, setData] = useState<TaxSummary | null>(null);
  const [search, setSearch] = useState("");
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    taxSummary()
      .then(setData)
      .catch((err) => {
        toast.error(err, "Could not load tax data");
        setData(null);
      });
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    const filtered = query ? data.lines.filter((row) => row.ref.toLowerCase().includes(query)) : data.lines;
    const sorted = [...filtered].sort((a, b) =>
      asc ? a.at.localeCompare(b.at) || a.ref.localeCompare(b.ref) : b.at.localeCompare(a.at),
    );
    return sorted.slice(0, 300);
  }, [data, search, asc]);

  if (!data) return <ManagerSkeleton variant="table" />;

  const rateLabel = `${data.ratePercent}%${data.inclusive ? " inclusive" : ""}`;
  const shownNet = rows.reduce((sum, row) => sum + row.netMinor, 0);
  const shownTax = rows.reduce((sum, row) => sum + row.taxMinor, 0);
  const shownGross = rows.reduce((sum, row) => sum + row.grossMinor, 0);

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Tax
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Tax detail</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Per-ticket VAT computation behind every figure — the full workbook.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-pos-primary-soft px-4 py-2 text-sm font-semibold text-pos-primary">
          <Percent size={15} /> {rateLabel}
        </span>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-pos-border bg-pos-surface p-3 shadow-pos-md">
        <label className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket reference…"
            className={`${fieldClass} w-full rounded-full pl-10`}
          />
        </label>
        <button
          type="button"
          onClick={() => setAsc((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            asc ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
          }`}
        >
          <ArrowDownWideNarrow size={15} />
          {asc ? "Oldest first" : "Newest first"}
        </button>
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 640 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Paid at</th>
                <th className="px-5 py-3 text-right">Gross</th>
                <th className="px-5 py-3 text-right">Net of VAT</th>
                <th className="px-5 py-3 text-right">VAT charged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-pos-ink-faint">
                    {search ? "No tickets match your search." : "No tickets found."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.ref} className="font-mono tabular-nums hover:bg-pos-surface-muted/50">
                    <td className="px-5 py-3 text-xs text-pos-ink-muted">{row.ref}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-[13px] text-pos-ink">
                      {prettyDay(row.at.slice(0, 10))}{" "}
                      <span className="text-xs text-pos-ink-faint">{timeOf(row.at)}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-pos-ink-muted">{naira(row.grossMinor)}</td>
                    <td className="px-5 py-3 text-right text-pos-ink">{naira(row.netMinor)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-pos-primary">
                      {naira(row.taxMinor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/60 font-semibold">
                  <td className="px-5 py-3" colSpan={2}>
                    {rows.length} shown
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{naira(shownGross)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{naira(shownNet)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-pos-primary">{naira(shownTax)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}