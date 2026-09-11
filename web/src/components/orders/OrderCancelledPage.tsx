"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleOff, RotateCcw } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { listPurchaseOrders, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

export function OrderCancelledPage() {
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listPurchaseOrders()
      .then((rows) => {
        setOrders(rows.filter((r) => ["cancelled", "rejected"].includes(r.status)));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;

  const cancelled = orders
    .filter((r) => r.status === "cancelled")
    .sort((a, b) => b.at.localeCompare(a.at));
  const rejected = orders.filter((r) => r.status === "rejected").sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Cancelled & rejected</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Orders that never reached the vendor — withdrawn by the creator or returned by the approver for revision.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Cancelled</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{cancelled.length}</p>
        </div>
        <div className="rounded-[18px] bg-red-50 p-5 shadow-pos-md dark:bg-red-950/40">
          <p className="text-[11px] uppercase tracking-wide text-red-700 dark:text-red-300">Rejected</p>
          <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">{rejected.length}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex items-center gap-2 border-b border-pos-border px-5 py-4">
            <CircleOff size={16} className="text-pos-ink-muted" />
            <h2 className="font-semibold text-pos-ink">Cancelled</h2>
            <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-xs text-pos-ink-muted">
              {cancelled.length}
            </span>
          </header>
          {cancelled.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-pos-ink-faint">Nothing was cancelled.</p>
          ) : (
            <ul className="divide-y divide-pos-border/50">
              {cancelled.map((row) => (
                <li key={row.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/orders/${row.id}`} className="font-mono text-sm font-semibold text-pos-ink hover:text-pos-primary">
                        {row.number}
                      </Link>
                      <span className="text-xs text-pos-ink-faint">{row.party || "—"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-pos-ink-muted">
                      Cancelled {prettyDay(row.at.slice(0, 10))} · {row.lines.length} lines
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-pos-ink-muted sm:text-right">{naira(row.totalMinor)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="flex items-center gap-2 border-b border-pos-border px-5 py-4">
            <RotateCcw size={16} className="text-red-600" />
            <h2 className="font-semibold text-pos-ink">Rejected for revision</h2>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              {rejected.length}
            </span>
          </header>
          {rejected.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-pos-ink-faint">Nothing was rejected.</p>
          ) : (
            <ul className="divide-y divide-pos-border/50">
              {rejected.map((row) => (
                <li key={row.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/orders/${row.id}`} className="font-mono text-sm font-semibold text-pos-ink hover:text-pos-primary">
                        {row.number}
                      </Link>
                      <span className="text-xs text-pos-ink-faint">{row.party || "—"}</span>
                    </div>
                    <p className="mt-1 text-xs text-pos-ink-muted">
                      Rejected {row.rejectedAt ? prettyDay(row.rejectedAt.slice(0, 10)) : "—"}
                      {row.rejectedBy ? ` · by ${row.rejectedBy}` : ""}
                    </p>
                    {row.rejectionReason ? (
                      <p className="mt-1.5 inline-block rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">
                        {row.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-semibold tabular-nums text-pos-ink-muted sm:text-right">{naira(row.totalMinor)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}