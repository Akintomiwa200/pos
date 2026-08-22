"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { naira } from "@/lib/hq-ops";
import { exportSetup, getOrgSettings } from "@/lib/hq-setup";
import { taxSummary, type TaxSummary as TaxData, paymentFeed, type PaymentFeed } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

export function FinanceDashboard() {
  const [tax, setTax] = useState<TaxData | null>(null);
  const [feed, setFeed] = useState<PaymentFeed | null>(null);
  const [vatNote, setVatNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([taxSummary(), paymentFeed(), getOrgSettings().catch(() => null)])
      .then(([taxData, feedData, settings]) => {
        setTax(taxData);
        setFeed(feedData);
        if (settings) {
          setVatNote(
            settings.pricesIncludeVat
              ? "Prices include VAT — tax is carved out of the gross."
              : "Prices exclude VAT — tax is added at checkout.",
          );
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load finance data");
        setTax(null);
        setFeed({ transactions: [], settlements: [] });
      });
  }, []);

  async function download() {
    setBusy(true);
    try {
      const bundle = await exportSetup("all");
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `books-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Books export downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export");
    } finally {
      setBusy(false);
    }
  }

  if (!tax || !feed) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <PageHeader
        kicker="Finance"
        title="Finance"
        copy="Naira settlements and FIRS VAT in one view — push to QuickBooks, Sage or Zoho from the export."
        action={
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Download size={15} /> Export books
          </button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Output VAT" value={naira(tax.outputTaxMinor)} hint={`Rate ${tax.ratePercent}%`} />
        <StatCard label="Input VAT" value={naira(tax.inputTaxMinor)} hint="From purchase invoices" />
        <StatCard label="Net VAT liability" value={naira(Math.max(0, tax.liabilityMinor))} hint={vatNote} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <TableShell columns={["Tender", "Settled"]}>
          {feed.settlements.length === 0 ? (
            <EmptyRow colSpan={2} message="No settlements yet." />
          ) : (
            feed.settlements.map((row) => (
              <tr key={row.tender} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium capitalize">{row.tender}</td>
                <td className="px-4 py-3">{naira(row.totalMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
        <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <h2 className="font-semibold">Compliance checklist</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2 border-b border-pos-border/60 pb-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pos-success" />
              <span>
                <strong>FIRS VAT</strong> — {vatNote || "Configure under Setup → Others → Settings"}. Net liability{" "}
                {naira(Math.max(0, tax.liabilityMinor))}.
              </span>
            </li>
            <li className="flex items-start gap-2 border-b border-pos-border/60 pb-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pos-success" />
              <span>
                <strong>Withholding tax</strong> — apply on B2B invoices; track credits manually against vendor
                accounts.
              </span>
            </li>
            <li className="flex items-start gap-2 border-b border-pos-border/60 pb-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pos-primary" />
              <span>
                <strong>Gateway settlements</strong> — Paystack / Flutterwave / Moniepoint payouts land T+1; reconcile
                against the tender totals here.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pos-primary" />
              <span>
                <strong>Books export</strong> — the JSON export carries org setup, catalog and every sale for your
                accountant&apos;s import.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
