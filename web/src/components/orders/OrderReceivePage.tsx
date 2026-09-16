"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, PackageCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { useLiveOrder } from "@/lib/live-orders";
import { ORDER_STATUS_LABEL, receiveOrder } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";
import { LiveBadge } from "../LiveBadge";

export function OrderReceivePage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { doc, live } = useLiveOrder(orderId, "purchase-order");
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!doc || initialized.current) return;
    initialized.current = true;
    const initial: Record<number, number> = {};
    doc.lines.forEach((line, i) => {
      initial[i] = line.receivedQty ?? 0;
    });
    setEdits(initial);
  }, [doc]);

  if (!doc) return <ManagerSkeleton variant="table" />;

  const totalQty = doc.lines.reduce((s, l) => s + l.quantity, 0);
  const totalIn = Object.values(edits).reduce((s, v) => s + v, 0);
  const overallPct = totalQty === 0 ? 0 : Math.round((totalIn / totalQty) * 100);

  async function save(partial: boolean) {
    const lines = doc!.lines.map((line, index) => ({
      index,
      receivedQty: Math.min(line.quantity, Math.max(0, Math.round(edits[index] ?? line.receivedQty ?? 0))),
    }));
    setBusy(true);
    try {
      await receiveOrder(doc!.id, partial ? { lines } : { full: true });
      toast.success(partial ? "Partial receipt saved." : "All goods received.");
      router.push(`/orders/${doc!.id}`);
    } catch (err) {
      toast.error(err, "Could not record receipt.");
    } finally {
      setBusy(false);
    }
  }

  const allDone = doc.lines.every((line, i) => (edits[i] ?? line.receivedQty ?? 0) >= line.quantity);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <Link
          href={`/orders/${doc.id}`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-pos-ink-muted hover:text-pos-ink"
        >
          <ArrowLeft size={15} />
          Back to order
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Purchases · Orders</p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
          {doc.number}
          <LiveBadge live={live} />
        </h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Record goods received per line — enter the total units received so far for each item.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Vendor</p>
          <p className="mt-2 text-lg font-medium text-pos-ink">{doc.party || "—"}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Expected delivery</p>
          <p className="mt-2 text-lg font-medium text-pos-ink">
            {doc.expectedAt ? prettyDay(doc.expectedAt.slice(0, 10)) : "—"}
          </p>
        </div>
        <div className="rounded-[18px] bg-pos-primary-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-primary">Overall progress</p>
          <div className="mt-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-pos-ink-muted">
              <span>{totalIn} / {totalQty} units</span>
              <span className="font-semibold tabular-nums text-pos-primary">{overallPct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/60">
              <div
                className={`h-full rounded-full transition-all ${overallPct >= 100 ? "bg-pos-success" : "bg-pos-primary"}`}
                style={{ width: `${Math.max(overallPct, 3)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Item</th>
                <th className="px-5 py-3.5 text-right">Ordered</th>
                <th className="px-5 py-3.5 text-right">Previous</th>
                <th className="px-5 py-3.5 text-right">Received so far</th>
                <th className="px-5 py-3.5 text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {doc.lines.map((line, i) => {
                const prev = line.receivedQty ?? 0;
                const current = edits[i] ?? prev;
                const linePct = line.quantity === 0 ? 0 : Math.round((current / line.quantity) * 100);
                const overage = current > line.quantity;
                return (
                  <tr key={i} className="hover:bg-pos-surface-muted/40">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-pos-ink">{line.name}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">{line.quantity}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-pos-ink-muted">{prev}</td>
                    <td className="px-5 py-4 text-right">
                      <input
                        type="number"
                        min={0}
                        max={line.quantity}
                        className={`w-20 rounded-xl border-0 px-3 py-2 text-right text-sm tabular-nums shadow-inner outline-none ring-1 focus:ring-2 focus:ring-pos-primary/60 ${
                          overage ? "ring-red-300 bg-red-50" : "ring-pos-border/60 bg-pos-surface-muted"
                        }`}
                        value={current}
                        onChange={(event) => {
                          const val = Math.max(0, parseInt(event.target.value, 10) || 0);
                          setEdits((prev) => ({ ...prev, [i]: val }));
                        }}
                      />
                      <div className="mt-1.5">
                        <div className="mx-auto h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-pos-surface-muted">
                          <div
                            className={`h-full rounded-full ${linePct >= 100 ? "bg-pos-success" : linePct > 0 ? "bg-pos-warning" : "bg-pos-primary/30"}`}
                            style={{ width: `${Math.min(linePct, 100)}%` }}
                          />
                        </div>
                        <p className={`mt-0.5 text-[11px] tabular-nums ${overage ? "font-semibold text-red-700" : "text-pos-ink-faint"}`}>
                          {linePct}%{overage ? " (over!)" : ""}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-semibold text-pos-ink">
                      {naira(line.quantity * line.unitPriceMinor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                <td className="px-5 py-3.5" colSpan={4}>Total order</td>
                <td className="px-5 py-3.5 text-right tabular-nums">{naira(doc.totalMinor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || allDone}
          onClick={() => void save(true)}
          className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <PackageCheck size={16} />
          Save partial receipt
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="inline-flex items-center gap-2 rounded-full border border-pos-border bg-pos-surface px-6 py-3 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
        >
          <CheckCircle2 size={16} className="text-pos-success" />
          Mark all goods received
        </button>
      </div>
    </div>
  );
}