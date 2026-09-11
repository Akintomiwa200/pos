"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ORDER_STATUS_LABEL, getOrder, type DocStatus, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

const STATUS_HEAD: Record<string, string> = {
  draft: "text-pos-ink-muted",
  pending_approval: "text-amber-700",
  approved: "text-pos-primary",
  open: "text-sky-700",
  partial: "text-amber-700",
  received: "text-emerald-700",
  closed: "text-pos-ink-muted",
  cancelled: "text-red-700",
  rejected: "text-red-700",
};

export function OrderPreviewPage({ orderId }: { orderId: string }) {
  const [doc, setDoc] = useState<TradeDoc | null>(null);

  useEffect(() => {
    let mounted = true;
    getOrder(orderId)
      .then((row) => mounted && setDoc(row))
      .catch((err) => {
        if (!mounted) return;
        toast.error(err, "Could not load order.");
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  if (!doc) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{doc.number}</h1>
          <p className={`mt-1.5 text-sm font-medium ${STATUS_HEAD[doc.status] ?? "text-pos-ink-muted"}`}>
            {ORDER_STATUS_LABEL[doc.status] ?? doc.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/orders/${doc.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
          >
            View detail
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Printer size={15} />
            Print / PDF
          </button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl rounded-[24px] bg-pos-surface p-8 shadow-pos-md print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-pos-border/60 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">Purchase order</p>
            <h2 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-pos-ink">{doc.number}</h2>
          </div>
          <div className="text-right text-sm text-pos-ink-muted">
            <p>Created {prettyDay(doc.at.slice(0, 10))}</p>
            {doc.expectedAt ? <p>Expected {prettyDay(doc.expectedAt.slice(0, 10))}</p> : null}
            <p className="mt-1">
              {doc.submittedAt ? `Submitted ${prettyDay(doc.submittedAt.slice(0, 10))}` : "Not yet submitted"}
            </p>
            {doc.approvedBy ? <p>Approved by {doc.approvedBy}</p> : null}
            {doc.receivedAt ? <p>Received {prettyDay(doc.receivedAt.slice(0, 10))}</p> : null}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">Vendor</p>
            <p className="mt-1 text-lg font-medium text-pos-ink">{doc.party || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">Notes</p>
            <p className="mt-1 text-sm text-pos-ink-muted">{doc.notes || "—"}</p>
          </div>
        </div>
        <table className="mt-8 w-full text-left text-sm">
          <thead className="border-b border-pos-border text-[11px] uppercase tracking-[0.08em] text-pos-ink-faint">
            <tr>
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 font-semibold text-right">Qty</th>
              <th className="py-2 font-semibold text-right">Received</th>
              <th className="py-2 font-semibold text-right">Unit</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, index) => (
              <tr key={index} className="border-b border-pos-border/50">
                <td className="py-3 font-medium text-pos-ink">{line.name}</td>
                <td className="py-3 text-right tabular-nums">{line.quantity}</td>
                <td className="py-3 text-right tabular-nums text-pos-ink-muted">{line.receivedQty ?? 0}</td>
                <td className="py-3 text-right tabular-nums">{naira(line.unitPriceMinor)}</td>
                <td className="py-3 text-right tabular-nums">{naira(line.quantity * line.unitPriceMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-pos-ink-muted">Total</p>
            <p className="text-2xl font-semibold tabular-nums text-pos-ink">{naira(doc.totalMinor)}</p>
          </div>
        </div>
        {doc.rejectionReason ? (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Rejected: {doc.rejectionReason}</p>
        ) : null}
        {doc.createdBy ? (
          <p className="mt-6 border-t border-pos-border/60 pt-4 text-xs text-pos-ink-faint">
            Prepared by {doc.createdBy}
          </p>
        ) : null}
      </article>
    </div>
  );
}