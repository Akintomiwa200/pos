"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileSearch, FileSpreadsheet, Landmark, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, taxSummary, type TaxSummary } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

export function InputTaxPage() {
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

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Tax
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Input tax</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          VAT paid on purchases, taken straight from recorded purchase invoices.
        </p>
      </header>

      <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pos-ink-faint">Recoverable VAT</p>
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-pos-ink">
          {naira(data.inputTaxMinor)}
        </p>
        <p className="mt-2 text-sm text-pos-ink-muted">
          At {rateLabel} — the amount you can deduct from output tax before remitting.
        </p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <p className="font-semibold text-pos-ink">Purchase invoices</p>
            <p className="mt-1 text-sm leading-relaxed text-pos-ink-muted">
              Every vendor bill recorded under Transaction → Purchase → Invoice contributes its VAT line by line.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
            <ArrowRight size={20} />
          </div>
          <div>
            <p className="font-semibold text-pos-ink">No manual journal</p>
            <p className="mt-1 text-sm leading-relaxed text-pos-ink-muted">
              Raise or correct vendor bills and this figure updates immediately — nothing to post by hand.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-surface-muted text-pos-ink-muted">
            <Landmark size={20} />
          </div>
          <div>
            <p className="font-semibold text-pos-ink">Carried to liability</p>
            <p className="mt-1 text-sm leading-relaxed text-pos-ink-muted">
              This recovered amount nets off against output VAT in the liability report.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <header className="border-b border-pos-border px-5 py-4">
          <h2 className="font-semibold text-pos-ink">How it flows</h2>
        </header>
        <div className="grid gap-0 md:grid-cols-3">
          <div className="relative p-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pos-surface-muted text-pos-ink-muted">
              <FileSearch size={22} />
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-pos-ink">
              Recorded vendor invoices
            </p>
          </div>
          <div className="relative p-6">
            <Plus className="absolute -top-1 left-1/2 hidden h-4 w-4 -translate-x-1/2 text-pos-primary md:block" />
            <ArrowRight className="absolute right-0 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-pos-primary md:block" />
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pos-primary-soft text-pos-primary">
              <Plus size={22} />
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-pos-ink">VAT extracted at {rateLabel}</p>
          </div>
          <div className="relative p-6 md:border-l md:border-pos-border/60">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pos-success-soft text-pos-success">
              <Landmark size={22} />
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-pos-ink">
              Input tax total — {naira(data.inputTaxMinor)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}