"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PackageCheck, Truck } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { listPurchaseOrders, receiveOrder, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

export function OrderReceivingPage() {
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listPurchaseOrders()
      .then((rows) => {
        setOrders(
          rows
            .filter((r) => ["approved", "open", "partial"].includes(r.status))
            .sort((a, b) => b.expectedAt?.localeCompare(a.expectedAt ?? "") ?? 0),
        );
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const fullyExpected = useMemo(() => orders.filter((r) => r.status !== "partial").length, [orders]);
  const partial = useMemo(() => orders.filter((r) => r.status === "partial").length, [orders]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Receiving</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Purchase orders awaiting delivery — expect a shipment, mark all lines in, or record partial receiving.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Awaiting delivery</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{fullyExpected}</p>
          <p className="mt-1 text-sm text-pos-ink-muted">not yet received</p>
        </div>
        <div className="rounded-[18px] bg-amber-50 p-5 shadow-pos-md dark:bg-amber-950/40">
          <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Partially received</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{partial}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Open value</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(orders.reduce((s, r) => s + r.totalMinor, 0))}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <section className="rounded-[24px] bg-pos-surface p-10 text-center shadow-pos-md">
          <PackageCheck size={28} className="mx-auto mb-2 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-muted">No orders are awaiting goods right now.</p>
        </section>
      ) : (
        <div className="space-y-3">
          {orders.map((row) => {
            const totalQty = row.lines.reduce((s, l) => s + l.quantity, 0);
            const receivedQty = row.lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
            const pct = totalQty === 0 ? 0 : Math.round((receivedQty / totalQty) * 100);
            const overdue = row.expectedAt && row.expectedAt.slice(0, 10) < new Date().toISOString().slice(0, 10);
            return (
              <section
                key={row.id}
                className="grid gap-4 rounded-[20px] bg-pos-surface p-5 shadow-pos-md transition hover:-translate-y-0.5 hover:shadow-pos-primary sm:grid-cols-[240px_1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/orders/${row.id}`} className="font-mono text-sm font-semibold text-pos-ink hover:text-pos-primary">
                      {row.number}
                    </Link>
                    {overdue ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Overdue</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-pos-ink">{row.party}</p>
                  <p className="mt-0.5 text-xs text-pos-ink-muted">
                    Expected {row.expectedAt ? prettyDay(row.expectedAt.slice(0, 10)) : "—"}
                  </p>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-pos-ink-muted">
                    <span>
                      {receivedQty} / {totalQty} units in
                    </span>
                    <span className="font-semibold tabular-nums text-pos-ink">{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-pos-surface-muted">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-pos-success" : pct > 0 ? "bg-pos-warning" : "bg-pos-primary"}`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-pos-ink-muted">{row.lines.length} line items</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <p className="w-full text-sm font-semibold tabular-nums text-pos-ink sm:text-right">
                    {naira(row.totalMinor)}
                  </p>
                  <Link
                    href={`/orders/receive/${row.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-pos-border bg-pos-surface px-4 py-2 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
                  >
                    <Truck size={14} />
                    Receive
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-pos-success px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    disabled={busyId === row.id}
                    onClick={async () => {
                      setBusyId(row.id);
                      try {
                        await receiveOrder(row.id, { full: true });
                        toast.success(`${row.number} fully received.`);
                        setOrders((prev) => prev.filter((r) => r.id !== row.id));
                      } catch (err) {
                        toast.error(err, "Could not receive.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <PackageCheck size={14} />
                    Receive all
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}