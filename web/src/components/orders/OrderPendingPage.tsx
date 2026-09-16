"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { useLiveOrders } from "@/lib/live-orders";
import { approveOrder, rejectOrder } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";
import { LiveBadge } from "../LiveBadge";

export function OrderPendingPage() {
  const { docs, live, ready, setDocs } = useLiveOrders("purchase-order");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      docs
        .filter((row) => row.status === "pending_approval")
        .sort((a, b) => b.at.localeCompare(a.at)),
    [docs],
  );

  const activeOrder = useMemo(() => pending.find((row) => row.id === selected) ?? null, [pending, selected]);

  useEffect(() => {
    if (pending.length > 0 && !selected) setSelected(pending[0].id);
  }, [pending, selected]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Purchases · Orders</p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
          Pending approval
          <LiveBadge live={live} />
        </h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Orders submitted by staff, awaiting your approval or rejection. Pick one on the left to review.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] bg-pos-primary-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-primary">Awaiting review</p>
          <p className="mt-2 text-2xl font-bold text-pos-primary">{pending.length}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Total value</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">
            {naira(pending.reduce((sum, row) => sum + row.totalMinor, 0))}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="h-max overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="border-b border-pos-border px-4 py-3">
            <p className="text-sm font-semibold text-pos-ink">Queue</p>
            <p className="text-xs text-pos-ink-faint">
              {pending.length} order{pending.length === 1 ? "" : "s"}
            </p>
          </header>
          <div className="max-h-[520px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-pos-ink-faint">Nothing waiting.</p>
            ) : (
              pending.map((row) => {
                const isActive = row.id === selected;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setSelected(row.id);
                      setReason("");
                    }}
                    className={`flex w-full items-center gap-3 border-b border-pos-border/40 px-4 py-3 text-left transition ${
                      isActive ? "bg-pos-primary text-white" : "hover:bg-pos-surface-muted"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-mono text-sm font-semibold ${isActive ? "text-white" : "text-pos-ink"}`}
                      >
                        {row.number}
                      </span>
                      <span className={`block text-xs ${isActive ? "text-white/70" : "text-pos-ink-faint"}`}>
                        {row.party || "—"} · {row.lines.length} lines
                      </span>
                    </span>
                    <span className={`text-sm font-semibold tabular-nums ${isActive ? "text-white" : "text-pos-ink"}`}>
                      {naira(row.totalMinor)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-[20px] bg-pos-surface shadow-pos-md">
          {!activeOrder ? (
            <div className="flex h-48 items-center justify-center text-sm text-pos-ink-faint">
              Select an order from the list to review it.
            </div>
          ) : (
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-lg font-semibold text-pos-ink">{activeOrder.number}</h2>
                  <p className="mt-1 text-base text-pos-ink-muted">{activeOrder.party}</p>
                </div>
                <Link href={`/orders/preview/${activeOrder.id}`} className="inline-flex items-center gap-1.5 text-sm text-pos-primary">
                  <Eye size={15} />
                  Preview
                </Link>
              </div>

              <table className="mt-5 w-full text-left text-sm">
                <thead className="border-b border-pos-border text-[11px] uppercase tracking-[0.08em] text-pos-ink-faint">
                  <tr>
                    <th className="pb-2.5 font-semibold">Item</th>
                    <th className="pb-2.5 font-semibold text-right">Qty</th>
                    <th className="pb-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/50">
                  {activeOrder.lines.map((line, i) => (
                    <tr key={i} className="hover:bg-pos-surface-muted/40">
                      <td className="whitespace-nowrap py-2.5 font-medium text-pos-ink">{line.name}</td>
                      <td className="whitespace-nowrap py-2.5 text-right tabular-nums">{line.quantity}</td>
                      <td className="whitespace-nowrap py-2.5 text-right tabular-nums">
                        {naira(line.quantity * line.unitPriceMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-pos-border font-semibold">
                    <td className="py-3" colSpan={2}>
                      Total
                    </td>
                    <td className="py-3 text-right tabular-nums">{naira(activeOrder.totalMinor)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className="mt-3 text-xs text-pos-ink-muted">
                Submitted {activeOrder.submittedAt ? prettyDay(activeOrder.submittedAt.slice(0, 10)) : "—"}
              </p>

              <div className="mt-6 space-y-3">
                <input
                  className="w-full rounded-2xl border-0 bg-pos-surface-muted px-4 py-3 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                  placeholder="Rejection reason (optional)"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-full bg-pos-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    disabled={busyId === activeOrder.id}
                    onClick={async () => {
                      setBusyId(activeOrder.id);
                      try {
                        await approveOrder(activeOrder.id, "Approver");
                        toast.success("Order approved.");
                        setDocs((prev) => prev.filter((r) => r.id !== activeOrder.id));
                        setSelected("");
                      } catch (err) {
                        toast.error(err, "Could not approve.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    disabled={busyId === activeOrder.id}
                    onClick={async () => {
                      setBusyId(activeOrder.id);
                      try {
                        await rejectOrder(activeOrder.id, reason || "Needs revision", "Approver");
                        toast.success("Order rejected.");
                        setReason("");
                        setDocs((prev) => prev.filter((r) => r.id !== activeOrder.id));
                        setSelected("");
                      } catch (err) {
                        toast.error(err, "Could not reject.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}