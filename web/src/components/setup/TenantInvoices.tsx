"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Receipt,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { payInvoice, useLiveBilling, type BillingInvoice } from "@/lib/billing";
import { ManagerSkeleton } from "@/components/Skeleton";
import { DataTable, PrimaryButton, SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

function money(minor: number) {
  return `₦${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAY_METHODS = [
  { id: "paystack", label: "Paystack", hint: "Card, transfer or USSD" },
  { id: "bank", label: "Bank transfer", hint: "Account transfer" },
  { id: "cash", label: "Cash", hint: "Pay in person at a branch" },
];

function PayInvoiceModal({ invoice, onClose }: { invoice: BillingInvoice; onClose: () => void }) {
  const [method, setMethod] = useState("paystack");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await payInvoice(invoice.id, { provider: method });
      toast.success(`${invoice.invoiceNo} settled via ${method}.`);
      onClose();
    } catch (err) {
      toast.error(err, "Could not confirm payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-md rounded-3xl bg-pos-surface p-5 shadow-pos-lg ring-1 ring-pos-border sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-pos-ink">Settle {invoice.invoiceNo}</h2>
              <p className="mt-0.5 text-[12px] text-pos-ink-muted">{invoice.label}</p>
            </div>
            <button
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-pos-primary-soft/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-primary">
              {money(invoice.amountMinor)} due {invoice.dueAt ? `by ${dateLabel(invoice.dueAt)}` : ""}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-pos-ink-muted">
              Choose how you paid. Confirmation is immediate and updates your company HQ in real
              time.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {PAY_METHODS.map((row) => (
              <button
                key={row.id}
                onClick={() => setMethod(row.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  method === row.id ? "border-pos-primary bg-pos-primary-soft/50" : "border-pos-border hover:bg-pos-surface-muted"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    method === row.id ? "bg-pos-primary text-white" : "bg-pos-surface-muted"
                  }`}
                >
                  {row.id === "paystack" ? (
                    <CreditCard size={16} />
                  ) : row.id === "bank" ? (
                    <Landmark size={16} />
                  ) : (
                    <Banknote size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold ${method === row.id ? "text-pos-primary" : "text-pos-ink"}`}>
                    {row.label}
                  </span>
                  <span className="block text-[11px] text-pos-ink-faint">{row.hint}</span>
                </span>
                <span
                  className={`size-4 shrink-0 rounded-full border-2 ${
                    method === row.id ? "border-pos-primary bg-pos-primary" : "border-pos-border"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-pos-border px-4 py-2.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted"
            >
              Cancel
            </button>
            <PrimaryButton disabled={busy} onClick={confirm}>
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Confirming…
                </>
              ) : (
                "Confirm payment"
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TenantInvoices() {
  const { subscriptions, company, invoices, live, ready } = useLiveBilling();
  const [paying, setPaying] = useState<BillingInvoice | null>(null);
  if (!ready) return <ManagerSkeleton variant="table" />;

  const sub = subscriptions[0] ?? null;
  const pending = invoices.filter((row) => (row.status === "pending" || row.status === "overdue") && row.amountMinor > 0);
  const paid = invoices.filter((row) => row.status === "paid");
  const pendingAmount = pending.reduce((sum, row) => sum + row.amountMinor, 0);
  const paidAmount = paid.reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <div>
      <SetupHeader
        kicker="Account · Billing"
        title="Invoices"
        copy="Invoices issued to your company for the active plan and till licences. Settle pending ones and watch them clear in real time."
        action={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium text-pos-ink">
              <WifiDot live={live} />
              {live ? "Live" : "Offline"}
            </span>
            {sub ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-pos-primary-soft px-3 py-2.5 text-[12px] font-semibold text-pos-primary">
                <Sparkles size={13} /> {sub.planName}
              </span>
            ) : null}
          </span>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total invoices" value={String(invoices.length)} hint="All time" tone="accent" />
        <SetupStat label="Outstanding" value={money(pendingAmount)} hint={`${pending.length} pending`} />
        <SetupStat label="Paid" value={String(paid.length)} hint="Settled" />
        <SetupStat label="Settled value" value={money(paidAmount)} hint="Confirmed payments" />
      </div>

      {company ? (
        <div className="mb-6 rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
                {company.name}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-pos-ink">
                {sub?.planName ?? "No plan assigned"}
              </h2>
              <p className="mt-0.5 text-sm text-pos-ink-muted">
                {sub ? `${money(sub.planPriceMinor)} / year · renews ${dateLabel(sub.renewsAt)}` : "Ask the platform team to assign your plan."}
              </p>
            </div>
            <Link
              href="/setup/billing/subscriptions"
              className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
            >
              Subscriptions
            </Link>
          </div>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No invoices yet. When a plan or till licence renews, its invoice lands here in real time.
        </div>
      ) : (
        <DataTable columns={["Invoice", "Line item", "Amount", "Issued", "Due", "Status", ""]}>
          {invoices.map((row) => (
            <tr key={row.id} className="hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-mono text-[13px] font-medium text-pos-ink">{row.invoiceNo}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.label || row.planName || row.tillName || "—"}</td>
              <td className="px-4 py-3 tabular-nums">{money(row.amountMinor)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{dateLabel(row.issuedAt)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{dateLabel(row.dueAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    row.status === "paid"
                      ? "bg-pos-success/10 text-pos-success"
                      : "bg-pos-warning/10 text-pos-warning"
                  }`}
                >
                  {row.status === "paid" ? "Paid" : row.status === "void" ? "Void" : "Pending"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {row.status === "pending" && row.amountMinor > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPaying(row)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pos-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-pos-primary transition hover:opacity-90"
                  >
                    <Receipt size={13} /> Pay now
                  </button>
                ) : row.status === "paid" ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-pos-success">
                    <BadgeCheck size={14} /> Settled
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-4 text-sm text-pos-ink-muted">
        <FileText size={16} className="shrink-0 text-pos-primary" />
        Payments sync straight back to the platform desk — settle an invoice here and the Super
        Admin console updates instantly.
      </div>

      {paying ? <PayInvoiceModal invoice={paying} onClose={() => setPaying(null)} /> : null}
    </div>
  );
}

function WifiDot({ live }: { live: boolean }) {
  return <span className={`size-1.5 rounded-full ${live ? "bg-pos-success" : "bg-pos-ink-faint"}`} />;
}