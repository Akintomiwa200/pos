"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { naira } from "@/lib/hq-ops";
import { useLiveOrders } from "@/lib/live-orders";
import { ORDER_STATUS_LABEL, type DocStatus, type OrderSummary } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";
import { LiveBadge } from "../LiveBadge";

function deriveSummary(docs: { status: string; totalMinor: number; party: string }[]): OrderSummary {
  const byStatus: Record<string, { count: number; totalMinor: number }> = {};
  const vendors = new Map<string, { count: number; totalMinor: number }>();
  for (const row of docs) {
    const bucket = byStatus[row.status] ?? { count: 0, totalMinor: 0 };
    bucket.count += 1;
    bucket.totalMinor += row.totalMinor;
    byStatus[row.status] = bucket;
    const vendor = vendors.get(row.party || "Unknown") ?? { count: 0, totalMinor: 0 };
    vendor.count += 1;
    vendor.totalMinor += row.totalMinor;
    vendors.set(row.party || "Unknown", vendor);
  }
  return {
    count: docs.length,
    totalMinor: docs.reduce((sum, row) => sum + row.totalMinor, 0),
    pendingApproval: docs.filter((row) => row.status === "pending_approval").length,
    awaitingReceive: docs.filter((row) => ["approved", "open", "partial"].includes(row.status)).length,
    byStatus,
    topVendors: [...vendors.entries()]
      .map(([party, stats]) => ({ party, ...stats }))
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .slice(0, 8),
  };
}

export function OrderSummaryPage() {
  const { docs, live, ready } = useLiveOrders("purchase-order");
  const summary = useMemo(() => deriveSummary(docs), [docs]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  const maxValue = Math.max(1, ...Object.values(summary.byStatus).map((s) => s.totalMinor));
  const statusRows = Object.entries(summary.byStatus).sort((a, b) => b[1].totalMinor - a[1].totalMinor);

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Purchases · Orders</p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
          Order summary
          <LiveBadge live={live} />
        </h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          The pipeline at a glance — value committed by order status and the vendors you order from most.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Orders</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{summary.count}</p>
        </div>
        <div className="rounded-[18px] bg-pos-primary-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-primary">Pipeline value</p>
          <p className="mt-2 text-2xl font-bold text-pos-primary">{naira(summary.totalMinor)}</p>
        </div>
        <div className="rounded-[18px] bg-amber-50 p-5 shadow-pos-md dark:bg-amber-950/40">
          <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Pending approval</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.pendingApproval}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Awaiting receive</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{summary.awaitingReceive}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <header className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-pos-primary" />
            <h2 className="font-semibold text-pos-ink">Value by status</h2>
          </header>
          {statusRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-pos-ink-faint">No orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {statusRows.map(([status, stats]) => (
                <li key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-pos-ink">
                      {ORDER_STATUS_LABEL[status as DocStatus] ?? status}
                    </span>
                    <span className="text-xs text-pos-ink-muted">
                      {stats.count} · {naira(stats.totalMinor)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-pos-surface-muted">
                    <div
                      className="h-full rounded-full bg-pos-primary"
                      style={{ width: `${Math.max(2, Math.round((stats.totalMinor / maxValue) * 100))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="border-b border-pos-border px-5 py-4">
            <h2 className="font-semibold text-pos-ink">Top vendors</h2>
          </header>
          {summary.topVendors.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-pos-ink-faint">No vendor spend yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-pos-border text-[11px] uppercase tracking-[0.08em] text-pos-ink-faint">
                <tr>
                  <th className="px-5 py-3 font-semibold">Vendor</th>
                  <th className="px-5 py-3 font-semibold text-right">Orders</th>
                  <th className="px-5 py-3 font-semibold text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/50">
                {summary.topVendors.map((row) => (
                  <tr key={row.party} className="hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3 font-medium text-pos-ink">{row.party}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-pos-ink-muted">{row.count}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-ink">
                      {naira(row.totalMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <footer className="border-t border-pos-border bg-pos-surface-muted/50 px-5 py-4">
            <Link href="/orders/new" className="text-sm font-medium text-pos-primary hover:underline">
              Create the next order →
            </Link>
          </footer>
        </section>
      </div>
    </div>
  );
}