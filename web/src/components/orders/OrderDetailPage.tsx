"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Edit3, Eye, PackageCheck, Send, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ORDER_STATUS_LABEL, getOrder, type DocStatus, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

const STATUS_TINT: Record<string, string> = {
  draft: "bg-pos-surface-muted text-pos-ink-muted",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-pos-primary-soft text-pos-primary border-pos-primary/20",
  open: "bg-sky-50 text-sky-700 border-sky-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-pos-surface-muted text-pos-ink-muted border-pos-border",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ICON: Record<string, string> = {
  draft: "📝",
  pending_approval: "⏳",
  approved: "✅",
  open: "✈️",
  partial: "📦",
  received: "🎉",
  closed: "✔️",
  cancelled: "❌",
  rejected: "↩️",
};

type EventKind = "created" | "submitted" | "approved" | "sent" | "received" | "closed" | "cancelled" | "rejected";

type TimelineEvent = {
  kind: EventKind;
  at: string | undefined;
  label: string;
  detail: string;
};

export function OrderDetailPage({ orderId }: { orderId: string }) {
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

  const events = (
    [
      { kind: "created" as const, at: doc.at, label: "Created", detail: doc.createdBy ? `by ${doc.createdBy}` : "Order drafted" },
      { kind: "submitted" as const, at: doc.submittedAt, label: "Submitted", detail: "Sent for approval" },
      { kind: "approved" as const, at: doc.approvedAt, label: "Approved", detail: doc.approvedBy ? `by ${doc.approvedBy}` : "Approved" },
      { kind: "sent" as const, at: doc.status === "open" ? doc.at : undefined, label: "Sent to vendor", detail: "Vendor has been notified" },
      { kind: "received" as const, at: doc.receivedAt, label: "Received", detail: "Goods received" },
      { kind: "closed" as const, at: doc.status === "closed" ? doc.receivedAt : undefined, label: "Closed", detail: "Order finalized" },
      { kind: "cancelled" as const, at: doc.status === "cancelled" ? doc.at : undefined, label: "Cancelled", detail: "Order withdrawn" },
      { kind: "rejected" as const, at: doc.rejectedAt, label: "Rejected", detail: doc.rejectionReason ?? "Rejected" },
    ] satisfies TimelineEvent[]
  ).filter((e) => e.at);

  const totalQty = doc.lines.reduce((s, l) => s + l.quantity, 0);
  const receivedQty = doc.lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
  const pct = totalQty === 0 ? 0 : Math.round((receivedQty / totalQty) * 100);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <Link href="/orders/list" className="mb-2 inline-flex items-center gap-1.5 text-sm text-pos-ink-muted hover:text-pos-ink">
          <ArrowLeft size={15} />
          Back to orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Order detail</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{doc.number}</h1>
            <p className={`mt-1.5 text-sm font-medium ${STATUS_TINT[doc.status]?.split(" ")[1] ?? ""}`}>
              {STATUS_ICON[doc.status]} {ORDER_STATUS_LABEL[doc.status]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/orders/preview/${doc.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
            >
              <Eye size={15} />
              Print preview
            </Link>
            <Link
              href={`/orders/edit/${doc.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Edit3 size={15} />
              Edit
            </Link>
          </div>
        </div>
      </header>

      <div className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Value</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-pos-ink">{naira(doc.totalMinor)}</p>
            <p className="mt-1 text-sm text-pos-ink-muted">{doc.lines.length} lines</p>
          </section>
          <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Vendor</p>
            <p className="mt-2 text-lg font-medium text-pos-ink">{doc.party || "—"}</p>
          </section>
          <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Expected delivery</p>
            <p className="mt-2 text-lg font-medium text-pos-ink">{doc.expectedAt ? prettyDay(doc.expectedAt.slice(0, 10)) : "—"}</p>
          </section>
          <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Receiving progress</p>
            <div className="mt-2.5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-pos-ink-muted">
                <span>{receivedQty} / {totalQty} units</span>
                <span className="font-semibold tabular-nums text-pos-ink">{pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-pos-surface-muted">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-pos-success" : pct > 0 ? "bg-pos-warning" : "bg-pos-primary/30"}`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </div>
          </section>
          {doc.notes ? (
            <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Notes</p>
              <p className="mt-2 text-sm text-pos-ink-muted">{doc.notes}</p>
            </section>
          ) : null}
        </aside>

        <div className="space-y-5">
          <section className="rounded-[20px] bg-pos-surface shadow-pos-md">
            <header className="border-b border-pos-border px-5 py-4">
              <h2 className="font-semibold text-pos-ink">Order lines</h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  <tr>
                    <th className="px-5 py-3.5">Item</th>
                    <th className="px-5 py-3.5 text-right">Qty</th>
                    <th className="px-5 py-3.5 text-right">Received</th>
                    <th className="px-5 py-3.5 text-right">Unit price</th>
                    <th className="px-5 py-3.5 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/50">
                  {doc.lines.map((line, i) => {
                    const linePct = line.quantity === 0 ? 0 : Math.round(((line.receivedQty ?? 0) / line.quantity) * 100);
                    return (
                      <tr key={i} className="hover:bg-pos-surface-muted/40">
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-pos-ink">{line.name}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{line.quantity}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                          <span className={linePct >= 100 ? "text-pos-success" : linePct > 0 ? "text-pos-warning" : "text-pos-ink-faint"}>
                            {line.receivedQty ?? 0} ({linePct}%)
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-pos-ink-muted">
                          {naira(line.unitPriceMinor)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-semibold text-pos-ink">
                          {naira(line.quantity * line.unitPriceMinor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                    <td className="px-5 py-3.5" colSpan={4}>Total</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{naira(doc.totalMinor)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="rounded-[20px] bg-pos-surface shadow-pos-md">
            <header className="border-b border-pos-border px-5 py-4">
              <h2 className="font-semibold text-pos-ink">Lifecycle</h2>
            </header>
            <div className="px-5 py-5">
              {events.length === 0 ? (
                <p className="py-4 text-center text-sm text-pos-ink-faint">No timeline events recorded.</p>
              ) : (
                <div className="relative border-l-2 border-pos-border pl-5">
                  {events.map((event, i) => (
                    <div key={event.kind} className="relative mb-5 last:mb-0">
                      <span
                        className={`absolute -left-[23px] top-0 grid h-4 w-4 place-items-center rounded-full border-2 text-[10px] ${
                          i === events.length - 1
                            ? "border-pos-primary bg-pos-primary text-white"
                            : "border-pos-border bg-pos-surface"
                        }`}
                      >
                        {event.kind === "received" || event.kind === "closed" || event.kind === "approved" ? (
                          <CheckCircle2 size={10} />
                        ) : event.kind === "cancelled" || event.kind === "rejected" ? (
                          <XCircle size={10} />
                        ) : event.kind === "sent" ? (
                          <Send size={9} />
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-pos-ink-faint" />
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_TINT[event.kind] ?? "bg-pos-surface-muted text-pos-ink-muted border-pos-border"}`}>
                          {event.label}
                        </span>
                        <span className="text-xs text-pos-ink-muted">
                          {event.at ? prettyDay(event.at.slice(0, 10)) : "—"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-pos-ink-muted">{event.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}