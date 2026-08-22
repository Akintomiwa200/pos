"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listCatalog,
  listSales,
  type HqSale,
} from "@/lib/hq-api";
import { aggregateSales, dayKey, naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  ChartCard,
  EmptyRow,
  PageHeader,
  RankBarChart,
  SharePieChart,
  StatCard,
  TableShell,
  Toolbar,
  TrendLineChart,
} from "../console/Chrome";

export type SalesReportVariant =
  | "analytics"
  | "invoice-list"
  | "invoice-summary"
  | "invoice-balance"
  | "invoice-history"
  | "invoice-shift";

const HEADERS: Record<SalesReportVariant, { kicker: string; title: string; copy: string }> = {
  analytics: {
    kicker: "Report · Sales",
    title: "Analytics",
    copy: "Revenue, ticket flow, and what is actually selling — across every till.",
  },
  "invoice-list": {
    kicker: "Report · Sales · Invoice",
    title: "Invoice List",
    copy: "Every ticket rung up on any till. Click a row for its line items.",
  },
  "invoice-summary": {
    kicker: "Report · Sales · Invoice",
    title: "Invoice Summary",
    copy: "Daily roll-up of tickets and revenue with tender breakdown.",
  },
  "invoice-balance": {
    kicker: "Report · Sales · Invoice",
    title: "Invoice Balance",
    copy: "Collected today versus anything still on credit.",
  },
  "invoice-history": {
    kicker: "Report · Sales · Invoice",
    title: "Invoice History",
    copy: "Chronological archive of all tickets, newest first.",
  },
  "invoice-shift": {
    kicker: "Report · Sales · Invoice",
    title: "Shift",
    copy: "Per-cashier, per-day performance — who sold what and when.",
  },
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

const CREDIT_HINTS = ["credit", "due", "owe", "receivable"];

export function SalesReports({ variant }: { variant: SalesReportVariant }) {
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [detail, setDetail] = useState<HqSale | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const aggregate = useMemo(
    () => (sales ? aggregateSales(sales) : null),
    [sales],
  );

  const header = HEADERS[variant];

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  if (variant === "analytics") {
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue" value={naira(aggregate.revenueMinor)} hint={`${aggregate.tickets} tickets`} />
          <StatCard label="Average ticket" value={naira(aggregate.avgTicketMinor)} />
          <StatCard label="Units sold" value={aggregate.units.toLocaleString()} />
          <StatCard
            label="Busiest day"
            value={
              aggregate.byDay.length
                ? prettyDay([...aggregate.byDay].sort((a, b) => b.totalMinor - a.totalMinor)[0]!.day)
                : "—"
            }
            hint={
              aggregate.byDay.length
                ? naira([...aggregate.byDay].sort((a, b) => b.totalMinor - a.totalMinor)[0]!.totalMinor)
                : undefined
            }
          />
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ChartCard title="Revenue trend" subtitle="Daily gross sales">
            {(colors) => (
              <TrendLineChart
                data={aggregate.byDay.map((row) => ({
                  label: prettyDay(row.day).replace(",", ""),
                  value: row.totalMinor,
                }))}
              />
            )}
          </ChartCard>
          <ChartCard title="Tender mix" subtitle="How customers paid">
            {() => (
              <SharePieChart
                data={aggregate.byTender.map((row) => ({ label: row.tender, value: row.totalMinor }))}
              />
            )}
          </ChartCard>
          <ChartCard title="Top categories" subtitle="Revenue by catalog category">
            {() => (
              <RankBarChart
                data={aggregate.byCategory.map((row) => ({ label: row.category, value: row.totalMinor }))}
              />
            )}
          </ChartCard>
          <ChartCard title="Best sellers" subtitle="Top items by revenue">
            {() => (
              <RankBarChart
                data={aggregate.byItem.slice(0, 7).map((row) => ({ label: row.name, value: row.totalMinor }))}
              />
            )}
          </ChartCard>
        </div>
      </div>
    );
  }

  if (variant === "invoice-list" || variant === "invoice-history") {
    const rows = [...sales].sort((a, b) =>
      variant === "invoice-list" ? b.paidAt.localeCompare(a.paidAt) : b.paidAt.localeCompare(a.paidAt),
    );
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <TicketTable rows={rows} onOpen={setDetail} />
        <TicketDetail sale={detail} onClose={() => setDetail(null)} />
      </div>
    );
  }

  if (variant === "invoice-summary") {
    const byDay = [...aggregate.byDay].reverse();
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total revenue" value={naira(aggregate.revenueMinor)} />
          <StatCard label="Tickets" value={aggregate.tickets.toLocaleString()} />
          <StatCard label="Average ticket" value={naira(aggregate.avgTicketMinor)} />
        </div>
        <TableShell columns={["Day", "Tickets", "Revenue", "Avg ticket"]}>
          {byDay.length === 0 ? (
            <EmptyRow colSpan={4} message="No sales recorded yet." />
          ) : (
            <>
              {byDay.map((row) => (
                <tr key={row.day} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">{prettyDay(row.day)}</td>
                  <td className="px-4 py-3">{row.tickets}</td>
                  <td className="px-4 py-3">{naira(row.totalMinor)}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{naira(Math.round(row.totalMinor / Math.max(1, row.tickets)))}</td>
                </tr>
              ))}
              <tr className="bg-pos-surface-muted font-semibold">
                <td className="px-4 py-3">All days</td>
                <td className="px-4 py-3">{aggregate.tickets}</td>
                <td className="px-4 py-3">{naira(aggregate.revenueMinor)}</td>
                <td className="px-4 py-3">{naira(aggregate.avgTicketMinor)}</td>
              </tr>
            </>
          )}
        </TableShell>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <TenderTable rows={aggregate.byTender} />
          <CashierTable rows={aggregate.byCashier} />
        </div>
      </div>
    );
  }

  if (variant === "invoice-balance") {
    const creditTickets = sales.filter((sale) =>
      CREDIT_HINTS.some((hint) => sale.tender.toLowerCase().includes(hint)),
    );
    const creditMinor = creditTickets.reduce((sum, sale) => sum + sale.totalMinor, 0);
    const collectedMinor = aggregate.revenueMinor - creditMinor;
    const byPartyCredit = new Map<string, number>();
    for (const sale of creditTickets) {
      const name = sale.cashierName || "Unknown";
      byPartyCredit.set(name, (byPartyCredit.get(name) ?? 0) + sale.totalMinor);
    }
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Billed" value={naira(aggregate.revenueMinor)} hint={`${aggregate.tickets} tickets`} />
          <StatCard label="Collected" value={naira(collectedMinor)} hint="Cash, transfer, card and other tenders" />
          <StatCard
            label="On credit"
            value={naira(creditMinor)}
            hint={creditTickets.length ? `${creditTickets.length} tickets on credit tenders` : "Nothing outstanding"}
          />
        </div>
        <TableShell columns={["Ticket", "Date", "Cashier", "Tender", "Amount"]}>
          {creditTickets.length === 0 ? (
            <EmptyRow colSpan={5} message="No credit sales — everything was collected at the till." />
          ) : (
            creditTickets.map((sale) => (
              <tr key={sale.ticketId} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-mono text-xs">{sale.ticketId}</td>
                <td className="px-4 py-3">{prettyDay(dayKey(sale.paidAt))} · {timeOf(sale.paidAt)}</td>
                <td className="px-4 py-3">{sale.cashierName}</td>
                <td className="px-4 py-3 capitalize">{sale.tender}</td>
                <td className="px-4 py-3 font-semibold text-pos-danger">{naira(sale.totalMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  // invoice-shift
  const shiftMap = new Map<string, { cashier: string; day: string; tickets: number; totalMinor: number }>();
  for (const sale of sales) {
    const key = `${sale.cashierName}|${dayKey(sale.paidAt)}`;
    const row =
      shiftMap.get(key) ??
      { cashier: sale.cashierName || "Unknown", day: dayKey(sale.paidAt), tickets: 0, totalMinor: 0 };
    row.tickets += 1;
    row.totalMinor += sale.totalMinor;
    shiftMap.set(key, row);
  }
  const shifts = [...shiftMap.values()].sort((a, b) =>
    b.day.localeCompare(a.day) || b.totalMinor - a.totalMinor,
  );
  return (
    <div>
      <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Cashiers seen" value={String(new Set(shifts.map((s) => s.cashier)).size)} />
        <StatCard label="Days covered" value={String(new Set(shifts.map((s) => s.day)).size)} />
        <StatCard label="Revenue" value={naira(aggregate.revenueMinor)} />
      </div>
      <TableShell columns={["Cashier", "Day", "Tickets", "Revenue"]}>
        {shifts.length === 0 ? (
          <EmptyRow colSpan={4} message="No shifts recorded yet." />
        ) : (
          shifts.map((row) => (
            <tr key={`${row.cashier}-${row.day}`} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{row.cashier}</td>
              <td className="px-4 py-3">{prettyDay(row.day)}</td>
              <td className="px-4 py-3">{row.tickets}</td>
              <td className="px-4 py-3">{naira(row.totalMinor)}</td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}

function TicketTable({
  rows,
  onOpen,
}: {
  rows: HqSale[];
  onOpen: (sale: HqSale) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.ticketId, row.cashierName, row.tender]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, search]);
  const shown = filtered.slice(0, 300);

  return (
    <TableShell
      columns={["Ticket", "Paid at", "Cashier", "Tender", "Items", "Total"]}
      toolbar={<Toolbar search={search} onSearch={setSearch} />}
    >
      {shown.length === 0 ? (
        <EmptyRow colSpan={6} message="No tickets found." />
      ) : (
        shown.map((sale) => (
          <tr
            key={sale.ticketId}
            className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
            onClick={() => onOpen(sale)}
          >
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{sale.ticketId}</td>
            <td className="whitespace-nowrap px-4 py-3">
              {prettyDay(dayKey(sale.paidAt))} · {timeOf(sale.paidAt)}
            </td>
            <td className="px-4 py-3">{sale.cashierName}</td>
            <td className="px-4 py-3 capitalize">{sale.tender}</td>
            <td className="px-4 py-3">{sale.lines?.length ?? 0}</td>
            <td className="px-4 py-3 font-semibold">{naira(sale.totalMinor)}</td>
          </tr>
        ))
      )}
    </TableShell>
  );
}

function TicketDetail({ sale, onClose }: { sale: HqSale | null; onClose: () => void }) {
  if (!sale) return null;
  return (
    <SlideOver open title={`Ticket ${sale.ticketId}`} subtitle={`${sale.cashierName} · ${prettyDay(dayKey(sale.paidAt))} ${timeOf(sale.paidAt)}`} onClose={onClose}>
      <TableShell columns={["Item", "Qty", "Price", "Amount"]} minWidth={420}>
        {(sale.lines ?? []).length === 0 ? (
          <EmptyRow colSpan={4} message="No line detail stored for this ticket." />
        ) : (
          sale.lines!.map((line, index) => (
            <tr key={line.id ?? index} className="border-b border-pos-border/60">
              <td className="px-4 py-2.5 font-medium">{line.name}</td>
              <td className="px-4 py-2.5">{line.quantity}</td>
              <td className="px-4 py-2.5">{naira(line.unitPriceMinor)}</td>
              <td className="px-4 py-2.5">{naira(line.unitPriceMinor * line.quantity)}</td>
            </tr>
          ))
        )}
        <tr className="bg-pos-surface-muted font-semibold">
          <td className="px-4 py-2.5" colSpan={3}>
            Total ({sale.tender})
          </td>
          <td className="px-4 py-2.5">{naira(sale.totalMinor)}</td>
        </tr>
      </TableShell>
    </SlideOver>
  );
}

function TenderTable({ rows }: { rows: Array<{ tender: string; totalMinor: number; count: number }> }) {
  return (
    <TableShell columns={["Tender", "Tickets", "Revenue"]}>
      {rows.length === 0 ? (
        <EmptyRow colSpan={3} />
      ) : (
        rows.map((row) => (
          <tr key={row.tender} className="border-b border-pos-border/60">
            <td className="px-4 py-3 font-medium capitalize">{row.tender}</td>
            <td className="px-4 py-3">{row.count}</td>
            <td className="px-4 py-3">{naira(row.totalMinor)}</td>
          </tr>
        ))
      )}
    </TableShell>
  );
}

function CashierTable({ rows }: { rows: Array<{ name: string; totalMinor: number; tickets: number }> }) {
  return (
    <TableShell columns={["Cashier", "Tickets", "Revenue"]}>
      {rows.length === 0 ? (
        <EmptyRow colSpan={3} />
      ) : (
        rows.slice(0, 8).map((row) => (
          <tr key={row.name} className="border-b border-pos-border/60">
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3">{row.tickets}</td>
            <td className="px-4 py-3">{naira(row.totalMinor)}</td>
          </tr>
        ))
      )}
    </TableShell>
  );
}
