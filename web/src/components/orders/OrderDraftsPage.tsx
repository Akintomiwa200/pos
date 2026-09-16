"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilePlus, Send } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { useLiveOrders } from "@/lib/live-orders";
import { submitOrder } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";
import { LiveBadge } from "../LiveBadge";

export function OrderDraftsPage() {
  const { docs, live, ready, setDocs } = useLiveOrders("purchase-order");
  const orders = useMemo(() => docs.filter((r) => r.status === "draft"), [docs]);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Purchases · Orders</p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
          Draft orders
          <LiveBadge live={live} />
        </h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Orders still being prepared. Review the lines, then submit for manager approval.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Drafts</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{orders.length}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Total value</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(orders.reduce((s, r) => s + r.totalMinor, 0))}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <section className="rounded-[24px] bg-pos-surface p-10 text-center shadow-pos-md">
          <FilePlus size={28} className="mx-auto mb-2 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-muted">No draft orders. Start by creating a new order.</p>
          <Link
            href="/orders/new"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
          >
            New order
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((row) => {
              const daysOld = Math.round(
                (Date.now() - new Date(row.at).getTime()) / (1000 * 60 * 60 * 24),
              );
              return (
                <section
                  key={row.id}
                  className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md transition hover:-translate-y-0.5 hover:shadow-pos-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-pos-ink">{row.number}</span>
                    <span className="inline-flex rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-medium text-pos-ink-muted">
                      {daysOld === 0 ? "Today" : `${daysOld}d ago`}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-base font-semibold text-pos-ink">{row.party || "—"}</p>
                  <p className="mt-1 text-sm text-pos-ink-muted">{row.lines.length} line items</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-pos-ink">{naira(row.totalMinor)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/orders/edit/${row.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-pos-border bg-pos-surface px-4 py-2 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
                    >
                      Continue editing
                    </Link>
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-pos-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      disabled={busyId === row.id}
                      onClick={async () => {
                        setBusyId(row.id);
                        try {
                          await submitOrder(row.id);
                          toast.success("Submitted for approval.");
                          setDocs((prev) => prev.filter((r) => r.id !== row.id));
                        } catch (err) {
                          toast.error(err, "Could not submit.");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      <Send size={14} />
                      Submit
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