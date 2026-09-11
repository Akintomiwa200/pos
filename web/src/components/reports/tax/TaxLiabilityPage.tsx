"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Calculator, Landmark, Minus, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, taxSummary, type TaxSummary } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

export function TaxLiabilityPage() {
  const [data, setData] = useState<TaxSummary | null>(null);

  useEffect(() => {
    taxSummary()
      .then(setData)
      .catch((err) => {
        toast.error(err, "Could not load tax data");
        setData(null);
      });
  }, []);

  if (!data) return <ManagerSkeleton variant="table" />;

  const rateLabel = `${data.ratePercent}%${data.inclusive ? " (inclusive)" : ""}`;
  const netPayable = Math.max(0, data.liabilityMinor);
  const credit = data.liabilityMinor < 0;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Tax
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">VAT liability</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          What you actually remit to FIRS: output tax minus recoverable input tax.
        </p>
      </header>

      <section className="mb-5 rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
          <Calculator size={14} /> Remittance reconciliation
        </p>

        <div className="mt-5 flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-4 rounded-2xl bg-pos-surface-muted p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-pos-success">
              <ArrowUpFromLine size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Output VAT collected</p>
              <p className="truncate text-xl font-bold tabular-nums text-pos-ink">{naira(data.outputTaxMinor)}</p>
            </div>
          </div>

          <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-primary text-white">
            <Minus size={18} />
          </span>

          <div className="flex flex-1 items-center gap-4 rounded-2xl bg-pos-surface-muted p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-100 text-pos-danger">
              <ArrowDownToLine size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Input VAT recoverable</p>
              <p className="truncate text-xl font-bold tabular-nums text-pos-ink">
                − {naira(data.inputTaxMinor)}
              </p>
            </div>
          </div>

          <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-primary text-white">
            <Plus size={18} />
          </span>

          <div
            className={`flex flex-1 items-center gap-4 rounded-2xl p-4 ${
              credit ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"
            }`}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-pos-ink shadow-pos-sm">
              <Landmark size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Net payable to FIRS</p>
              <p
                className={`truncate text-xl font-bold tabular-nums ${
                  credit ? "text-pos-warning" : "text-pos-success"
                }`}
              >
                {naira(netPayable)}
              </p>
            </div>
          </div>
        </div>

        {credit ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Credit position — recoverable input tax exceeds output tax. The surplus carries forward to the next
            period instead of a payment.
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-2xl border border-pos-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-pos-border/50">
              <tr>
                <td className="px-4 py-3 text-pos-ink-muted">
                  VAT collected on sales ({rateLabel})
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-pos-ink">
                  {naira(data.outputTaxMinor)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-pos-ink-muted">VAT paid on purchases</td>
                <td className="px-4 py-3 text-right tabular-nums text-pos-ink-muted">
                  − {naira(data.inputTaxMinor)}
                </td>
              </tr>
              <tr className="bg-pos-surface-muted/70 font-semibold">
                <td className="px-4 py-3 text-pos-ink">Net VAT liability</td>
                <td className="px-4 py-3 text-right tabular-nums text-pos-ink">{naira(data.liabilityMinor)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
            <Minus size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Registered rate</p>
            <p className="truncate text-lg font-bold tabular-nums text-pos-ink">{rateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
            <Landmark size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Collector</p>
            <p className="truncate text-lg font-bold text-pos-ink">Federal Inland Revenue Service</p>
          </div>
        </div>
      </div>
    </div>
  );
}