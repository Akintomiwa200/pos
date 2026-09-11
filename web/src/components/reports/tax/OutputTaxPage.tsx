"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Landmark, ReceiptText } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay, taxSummary, type TaxSummary } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

export function OutputTaxPage() {
  const [data, setData] = useState<TaxSummary | null>(null);

  useEffect(() => {
    taxSummary()
      .then(setData)
      .catch((err) => {
        toast.error(err, "Could not load tax data");
        setData(null);
      });
  }, []);

  const lines = useMemo(
    () => (data ? [...data.lines].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200) : []),
    [data],
  );

  if (!data) return <ManagerSkeleton variant="table" />;

  const taxable = data.lines.reduce((sum, line) => sum + line.netMinor, 0);
  const rateLabel = `${data.ratePercent}%${data.inclusive ? " inclusive" : ""}`;
  const meterWidth = Math.min(100, Math.round((data.outputTaxMinor / Math.max(1, taxable)) * 100));

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Tax
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Output tax</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          VAT charged on your sales — the tax you collect on behalf of FIRS.
        </p>
      </header>

      <section className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <article className="rounded-[24px] bg-pos-primary p-6 text-white shadow-pos-primary">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
            <BadgePercent size={14} /> Collection meter
          </p>
          <p className="mt-4 text-sm text-white/70">VAT collected on sales</p>
          <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">{naira(data.outputTaxMinor)}</p>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-white/75">
              <span>0</span>
              <span>Rate {rateLabel}</span>
            </div>
            <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${meterWidth}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/70">
              {meterWidth}% of the taxable base
            </p>
          </div>
        </article>

        <article className="grid grid-cols-2 gap-4">
          <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
              <Landmark size={19} />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wide text-pos-ink-faint">Taxable sales (net)</p>
            <p className="mt-1 truncate text-2xl font-bold tabular-nums text-pos-ink">{naira(taxable)}</p>
            <p className="mt-1 text-xs text-pos-ink-faint">Across {data.lines.length} tickets</p>
          </div>
          <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
              <ReceiptText size={19} />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wide text-pos-ink-faint">Applied rate</p>
            <p className="mt-1 truncate text-2xl font-bold tabular-nums text-pos-ink">{rateLabel}</p>
            <p className="mt-1 text-xs text-pos-ink-faint">
              {data.inclusive ? "VAT inside gross prices" : "VAT added on top"}
            </p>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <header className="flex items-center justify-between border-b border-pos-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-pos-ink">Collection ledger</h2>
            <p className="mt-0.5 text-xs text-pos-ink-faint">Newest tickets first</p>
          </div>
          <span className="rounded-full bg-pos-primary-soft px-3 py-1 text-xs font-semibold text-pos-primary">
            {lines.length} shown
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 560 }}>
            <thead className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Net</th>
                <th className="px-5 py-3 text-right text-pos-primary">VAT</th>
                <th className="px-5 py-3 text-right">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-pos-ink-faint">
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.ref} className="hover:bg-pos-surface-muted/50">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-pos-ink-muted">
                      {line.ref}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">{prettyDay(line.at.slice(0, 10))}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{naira(line.netMinor)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-primary">
                      {naira(line.taxMinor)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-pos-ink-muted">
                      {naira(line.grossMinor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lines.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/60 font-semibold">
                  <td className="px-5 py-3" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{naira(taxable)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-pos-primary">
                    {naira(data.outputTaxMinor)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {naira(data.lines.reduce((sum, line) => sum + line.grossMinor, 0))}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}