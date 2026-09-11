"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronDown, ReceiptText } from "lucide-react";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { aggregateSales, dayKey, naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";

function DayCard({
  date,
  dayLabel,
  tickets,
  totalMinor,
  avgMinor,
  tenders,
  cashiers,
  defaultOpen,
}: {
  date: string;
  dayLabel: string;
  tickets: number;
  totalMinor: number;
  avgMinor: number;
  tenders: Array<{ tender: string; totalMinor: number; count: number }>;
  cashiers: Array<{ name: string; totalMinor: number; tickets: number }>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const maxTender = Math.max(1, ...tenders.map((row) => row.totalMinor));
  const today = dayKey(new Date().toISOString());

  return (
    <article className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-pos-surface-muted/60"
      >
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-[11px] font-bold leading-tight ${
            date === today ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
          }`}
        >
          <span className="text-center">
            {prettyDay(date).split(" ")[1]}
            <br />
            {prettyDay(date).split(" ")[0]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-pos-ink">{dayLabel}</p>
          <p className="mt-0.5 text-xs text-pos-ink-faint">
            {tickets} ticket{tickets === 1 ? "" : "s"} · avg {naira(avgMinor)}
          </p>
        </div>
        <p className="shrink-0 text-base font-bold tabular-nums text-pos-ink">{naira(totalMinor)}</p>
        <ChevronDown
          size={18}
          className={`shrink-0 text-pos-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="grid gap-4 border-t border-pos-border/60 bg-pos-surface-muted/40 px-5 py-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-pos-ink-faint">
              Tenders
            </p>
            {tenders.length === 0 ? (
              <p className="text-xs text-pos-ink-faint">None recorded.</p>
            ) : (
              <ul className="space-y-2">
                {tenders.map((row) => (
                  <li key={row.tender} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="capitalize text-pos-ink-muted">
                        {row.tender} <span className="text-pos-ink-faint">· {row.count}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pos-surface">
                      <div
                        className="h-full rounded-full bg-pos-primary"
                        style={{ width: `${Math.round((row.totalMinor / maxTender) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-pos-ink-faint">
              Cashiers
            </p>
            {cashiers.length === 0 ? (
              <p className="text-xs text-pos-ink-faint">None recorded.</p>
            ) : (
              <ul className="space-y-1.5">
                {cashiers.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 rounded-xl bg-pos-surface px-3 py-2 text-sm">
                    <span className="truncate font-medium text-pos-ink">{row.name}</span>
                    <span className="shrink-0 text-xs text-pos-ink-faint">
                      {row.tickets} ·{" "}
                      <span className="font-semibold text-pos-ink">{naira(row.totalMinor)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function InvoiceSummaryPage() {
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const aggregate = useMemo(() => (sales ? aggregateSales(sales) : null), [sales]);

  const byDayMap = useMemo(() => {
    if (!sales) return new Map<string, HqSale[]>();
    const map = new Map<string, HqSale[]>();
    for (const sale of sales) {
      const key = dayKey(sale.paidAt);
      const rows = map.get(key) ?? [];
      rows.push(sale);
      map.set(key, rows);
    }
    return map;
  }, [sales]);

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  const dayRows = [...aggregate.byDay].reverse().map((row) => {
    const daySales = byDayMap.get(row.day) ?? [];
    const tenderMap = new Map<string, { tender: string; totalMinor: number; count: number }>();
    const cashierMap = new Map<string, { name: string; totalMinor: number; tickets: number }>();
    for (const sale of daySales) {
      const tender = tenderMap.get(sale.tender) ?? { tender: sale.tender, totalMinor: 0, count: 0 };
      tender.totalMinor += sale.totalMinor;
      tender.count += 1;
      tenderMap.set(sale.tender, tender);
      const name = sale.cashierName || "Unknown";
      const cashier = cashierMap.get(name) ?? { name, totalMinor: 0, tickets: 0 };
      cashier.totalMinor += sale.totalMinor;
      cashier.tickets += 1;
      cashierMap.set(name, cashier);
    }
    return {
      day: row.day,
      tickets: row.tickets,
      totalMinor: row.totalMinor,
      avgMinor: Math.round(row.totalMinor / Math.max(1, row.tickets)),
      tenders: [...tenderMap.values()].sort((a, b) => b.totalMinor - a.totalMinor),
      cashiers: [...cashierMap.values()].sort((a, b) => b.totalMinor - a.totalMinor),
    };
  });

  const today = dayKey(new Date().toISOString());

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Sales · Invoice
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Invoice summary</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Daily roll-up of tickets and revenue with tender and cashier breakdown.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-pos-surface px-4 py-2 text-sm shadow-pos-md">
          <CalendarRange size={15} className="text-pos-primary" />
          <span className="text-pos-ink-muted">
            <span className="font-bold text-pos-ink">{dayRows.length}</span> days ·
            <span className="font-bold text-pos-ink"> {aggregate.tickets}</span> tickets ·
            <span className="font-bold text-pos-ink"> {naira(aggregate.revenueMinor)}</span>
          </span>
        </div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-primary p-4 text-white shadow-pos-primary">
          <ReceiptText size={22} className="shrink-0 opacity-80" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-white/70">All-time revenue</p>
            <p className="truncate text-xl font-bold tabular-nums">{naira(aggregate.revenueMinor)}</p>
          </div>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Average ticket</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-pos-ink">
            {naira(aggregate.avgTicketMinor)}
          </p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-4 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Tickets rung</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-pos-ink">
            {aggregate.tickets.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {dayRows.length === 0 ? (
          <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
            <ReceiptText size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
            <p className="text-sm text-pos-ink-faint">No sales recorded yet.</p>
          </div>
        ) : (
          dayRows.map((row) => (
            <DayCard
              key={row.day}
              date={row.day}
              dayLabel={prettyDay(row.day)}
              tickets={row.tickets}
              totalMinor={row.totalMinor}
              avgMinor={row.avgMinor}
              tenders={row.tenders}
              cashiers={row.cashiers}
              defaultOpen={row.day === today}
            />
          ))
        )}
      </div>
    </div>
  );
}