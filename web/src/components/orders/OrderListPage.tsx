"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ORDER_STATUS_LABEL, listPurchaseOrders, type DocStatus, type TradeDoc } from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

const COLUMNS: Array<{ key: DocStatus; tint: string; dot: string }> = [
  { key: "draft", tint: "bg-pos-surface-muted/70", dot: "bg-pos-ink-faint" },
  { key: "pending_approval", tint: "bg-amber-50/70", dot: "bg-amber-500" },
  { key: "approved", tint: "bg-pos-primary-soft/50", dot: "bg-pos-primary" },
  { key: "open", tint: "bg-sky-50/70", dot: "bg-sky-500" },
  { key: "partial", tint: "bg-amber-50/70", dot: "bg-amber-500" },
  { key: "received", tint: "bg-emerald-50/70", dot: "bg-emerald-500" },
  { key: "closed", tint: "bg-pos-surface-muted/70", dot: "bg-pos-ink-faint" },
  { key: "cancelled", tint: "bg-red-50/70", dot: "bg-red-500" },
];

export function OrderListPage() {
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listPurchaseOrders()
      .then((rows) => {
        setOrders(rows);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...orders].sort((a, b) => b.at.localeCompare(a.at));
    if (!q) return sorted;
    return sorted.filter((row) =>
      [row.number, row.party, row.notes ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [orders, query]);

  const inView = visible.length;
  const inViewValue = visible.reduce((sum, row) => sum + row.totalMinor, 0);
  const awaiting = orders.filter((row) => ["approved", "open", "partial"].includes(row.status)).length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Order pipeline</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Every purchase order on one board, grouped by workflow stage. Search by number, vendor, or notes.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Orders in view</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{inView}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Value in view</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(inViewValue)}</p>
        </div>
        <div className="rounded-[18px] bg-pos-primary-soft p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-primary">Awaiting goods</p>
          <p className="mt-2 text-2xl font-bold text-pos-primary">{awaiting}</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
        <input
          className="w-full rounded-2xl border-0 bg-pos-surface py-3 pl-11 pr-4 text-sm shadow-pos-md outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
          placeholder="Search number, vendor, notes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const rows = visible
            .filter((row) => row.status === column.key)
            .sort((a, b) => b.at.localeCompare(a.at));
          const total = rows.reduce((sum, row) => sum + row.totalMinor, 0);
          return (
            <section key={column.key} className={`w-72 shrink-0 rounded-[20px] p-3 ${column.tint}`}>
              <header className="flex items-center justify-between px-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                  <span className="text-sm font-semibold text-pos-ink">
                    {ORDER_STATUS_LABEL[column.key] ?? column.key}
                  </span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-pos-ink-faint">{rows.length}</span>
              </header>
              <div className="space-y-2.5">
                {rows.length === 0 ? (
                  <p className="rounded-xl bg-white/50 px-3 py-6 text-center text-xs text-pos-ink-faint dark:bg-white/5">
                    Nothing here
                  </p>
                ) : (
                  rows.map((row) => (
                    <Link
                      key={row.id}
                      href={`/orders/${row.id}`}
                      className="block rounded-2xl bg-pos-surface p-3.5 shadow-pos-sm transition hover:-translate-y-0.5 hover:shadow-pos-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-pos-ink">{row.number}</span>
                        <ExternalLink size={13} className="text-pos-ink-faint" />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-pos-ink">{row.party || "—"}</p>
                      <p className="mt-2 text-xs text-pos-ink-muted">
                        Ordered {prettyDay(row.at.slice(0, 10))}
                        {row.expectedAt ? ` · expected ${prettyDay(row.expectedAt.slice(0, 10))}` : ""}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</p>
                    </Link>
                  ))
                )}
              </div>
              {rows.length > 0 ? (
                <footer className="mt-2 px-1 text-right text-xs font-semibold tabular-nums text-pos-ink-muted">
                  {naira(total)}
                </footer>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}