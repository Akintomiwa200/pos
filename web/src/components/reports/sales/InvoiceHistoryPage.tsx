"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, ReceiptText, Rows3 } from "lucide-react";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { dayKey, naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

const TENDER_DOT: Record<string, string> = {
  cash: "bg-emerald-500",
  transfer: "bg-sky-500",
  card: "bg-violet-500",
};

function dotColor(tender: string) {
  return TENDER_DOT[tender.toLowerCase()] ?? "bg-pos-primary";
}

export function InvoiceHistoryPage() {
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const groups = useMemo(() => {
    if (!sales) return [];
    const sorted = [...sales].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    const map = new Map<string, HqSale[]>();
    for (const sale of sorted) {
      const key = dayKey(sale.paidAt);
      const rows = map.get(key) ?? [];
      rows.push(sale);
      map.set(key, rows);
    }
    return [...map.entries()].map(([day, rows]) => ({
      day,
      rows,
      totalMinor: rows.reduce((sum, sale) => sum + sale.totalMinor, 0),
      count: rows.length,
    }));
  }, [sales]);

  if (!sales) return <ManagerSkeleton variant="list" />;

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Sales · Invoice
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Invoice history</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Chronological archive of every ticket, newest first, laid out on a timeline.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-pos-surface px-4 py-2 text-sm text-pos-ink-muted shadow-pos-md">
          <Rows3 size={15} className="text-pos-primary" />
          <span>
            <span className="font-bold text-pos-ink">{groups.length}</span> days ·
            <span className="font-bold text-pos-ink"> {sales.length}</span> tickets
          </span>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
          <ReceiptText size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-faint">No tickets recorded yet — the timeline is empty.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.slice(0, 60).map((group) => (
            <section key={group.day}>
              <div className="mb-3 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-pos-ink-muted shadow-pos-sm">
                  <Clock3 size={13} className="text-pos-primary" />
                  {prettyDay(group.day)}
                </span>
                <span className="h-px flex-1 bg-pos-border/60" />
                <span className="text-xs tabular-nums text-pos-ink-faint">
                  {group.count} tickets · <span className="font-semibold text-pos-ink">{naira(group.totalMinor)}</span>
                </span>
              </div>

              <ol className="relative ml-4 space-y-2 border-l-2 border-pos-border/60 pl-6">
                {group.rows.map((sale) => (
                  <li key={sale.ticketId} className="relative">
                    <span
                      className={`absolute -left-[31px] top-5 h-3 w-3 rounded-full ring-4 ring-pos-surface ${dotColor(
                        sale.tender,
                      )}`}
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-pos-surface px-4 py-3 shadow-pos-sm">
                      <span className="font-mono text-xs text-pos-ink-muted">{sale.ticketId}</span>
                      <span className="text-xs tabular-nums text-pos-ink-faint">{timeOf(sale.paidAt)}</span>
                      <span className="truncate text-sm font-medium text-pos-ink">
                        {sale.cashierName || "Cashier"}
                      </span>
                      <span className="truncate text-xs capitalize text-pos-ink-muted">{sale.tender}</span>
                      <span className="ml-auto text-sm font-bold tabular-nums text-pos-ink">
                        {naira(sale.totalMinor)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}