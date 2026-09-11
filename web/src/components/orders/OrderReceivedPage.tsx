"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, History } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { listPurchaseOrders, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

export function OrderReceivedPage() {
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listPurchaseOrders()
      .then((rows) => {
        setOrders(rows.filter((r) => ["received", "closed"].includes(r.status)));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const rows = useMemo(
    () => [...orders].sort((a, b) => (b.receivedAt ?? b.at).localeCompare(a.receivedAt ?? a.at)),
    [orders],
  );

  if (!ready) return <ManagerSkeleton variant="table" />;

  const value = rows.reduce((sum, r) => sum + r.totalMinor, 0);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Received & closed</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          The goods-in log — every order marked received, plus orders closed on the books.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Received</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">
            {rows.filter((r) => r.status === "received").length}
          </p>
        </div>
        <div className="rounded-[18px] bg-pos-success-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-success">Closed</p>
          <p className="mt-2 text-2xl font-bold text-pos-success">
            {rows.filter((r) => r.status === "closed").length}
          </p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Value booked</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(value)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 720 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Vendor</th>
                <th className="px-5 py-3.5">Received</th>
                <th className="px-5 py-3.5 text-right">Lines</th>
                <th className="px-5 py-3.5 text-right">Value</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                    <History size={28} className="mx-auto mb-2 opacity-40" />
                    No received orders yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${row.id}`} className="font-mono text-[13px] font-semibold text-pos-ink hover:text-pos-primary">
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-pos-ink">{row.party || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-pos-ink-muted">
                      {prettyDay((row.receivedAt ?? row.at).slice(0, 10))}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.lines.length}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-ink">
                      {naira(row.totalMinor)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.status === "closed"
                            ? "bg-pos-surface-muted text-pos-ink-muted"
                            : "bg-pos-success-soft text-pos-success"
                        }`}
                      >
                        {row.status === "closed" ? null : <CheckCircle2 size={12} />}
                        {row.status === "closed" ? "Closed" : "Received"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}