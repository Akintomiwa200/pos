"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Landmark, Send } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { listPurchaseOrders, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

export function OrderApprovedPage() {
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listPurchaseOrders()
      .then((rows) => {
        setOrders(rows.filter((r) => ["approved", "open"].includes(r.status)));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const approved = useMemo(() => {
    const list = orders.filter((r) => r.status === "approved");
    return list.sort((a, b) => (b.approvedAt ?? b.at).localeCompare(a.approvedAt ?? a.at));
  }, [orders]);
  const sent = useMemo(() => orders.filter((r) => r.status === "open").sort((a, b) => b.at.localeCompare(a.at)), [orders]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  const total = [...approved, ...sent].reduce((sum, r) => sum + r.totalMinor, 0);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Approved & sent</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Orders that cleared approval and have been released to the vendor — a running record of the green-lit work.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Approved</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{approved.length}</p>
        </div>
        <div className="rounded-[18px] bg-pos-primary-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-primary">Sent to vendor</p>
          <p className="mt-2 text-2xl font-bold text-pos-primary">{sent.length}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Committed value</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(total)}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex items-center gap-2 border-b border-pos-border px-5 py-4">
            <Landmark size={16} className="text-pos-primary" />
            <h2 className="font-semibold text-pos-ink">Approved, not yet sent</h2>
          </header>
          {approved.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-pos-ink-faint">No approved orders waiting to be sent.</p>
          ) : (
            <ul className="divide-y divide-pos-border/50">
              {approved.map((row) => (
                <li key={row.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[220px_1fr_auto] sm:items-center">
                  <div>
                    <Link href={`/orders/${row.id}`} className="font-mono text-sm font-semibold text-pos-ink hover:text-pos-primary">
                      {row.number}
                    </Link>
                    <p className="mt-0.5 text-sm text-pos-ink-muted">{row.party}</p>
                  </div>
                  <div className="text-sm text-pos-ink-muted">
                    <p>
                      Approved {row.approvedAt ? prettyDay(row.approvedAt.slice(0, 10)) : "—"}
                      {row.approvedBy ? ` · by ${row.approvedBy}` : ""}
                    </p>
                    <p className="mt-0.5">
                      {row.lines.length} lines · expected{" "}
                      {row.expectedAt ? prettyDay(row.expectedAt.slice(0, 10)) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</p>
                    <Link href={`/orders/receive/${row.id}`} className="mt-1 inline-block text-sm text-pos-primary">
                      Mark sent →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex items-center gap-2 border-b border-pos-border px-5 py-4">
            <Send size={16} className="text-sky-600" />
            <h2 className="font-semibold text-pos-ink">Sent to vendor</h2>
          </header>
          {sent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-pos-ink-faint">No orders sent to a vendor yet.</p>
          ) : (
            <ul className="divide-y divide-pos-border/50">
              {sent.map((row) => (
                <li key={row.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[220px_1fr_auto] sm:items-center">
                  <div>
                    <Link href={`/orders/${row.id}`} className="font-mono text-sm font-semibold text-pos-ink hover:text-pos-primary">
                      {row.number}
                    </Link>
                    <p className="mt-0.5 text-sm text-pos-ink-muted">{row.party}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-pos-ink-muted">
                    <CheckCircle2 size={14} className="shrink-0 text-sky-600" />
                    <p>
                      In the vendor&apos;s hands since {prettyDay(row.at.slice(0, 10))} · expected{" "}
                      {row.expectedAt ? prettyDay(row.expectedAt.slice(0, 10)) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</p>
                    <Link href={`/orders/receive/${row.id}`} className="mt-1 inline-block text-sm text-pos-primary">
                      Receive goods →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}