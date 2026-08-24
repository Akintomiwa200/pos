"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  FileBarChart2,
  Radio,
  Ticket,
  Users,
} from "lucide-react";
import { useLiveAudit, type AuditSnapshot } from "@/lib/live-audit";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell, Toolbar } from "../console/Chrome";

export type AuditVariant =
  | "overview"
  | "x-report"
  | "z-report"
  | "tenders"
  | "tickets"
  | "cashiers"
  | "drawer"
  | "exceptions";

const LINKS: Array<{ href: string; label: string; icon: LucideIcon; copy: string }> = [
  {
    href: "/audit/x-report",
    label: "Mid-day Check",
    icon: FileBarChart2,
    copy: "See today’s sales anytime — nothing closes",
  },
  {
    href: "/audit/z-report",
    label: "End of Day",
    icon: ClipboardList,
    copy: "Final sales figure before you bank the cash",
  },
  {
    href: "/audit/tenders",
    label: "Payment Methods",
    icon: Banknote,
    copy: "Cash, card, transfer and other payments",
  },
  {
    href: "/audit/tickets",
    label: "Sales List",
    icon: Ticket,
    copy: "Every sale made today, one by one",
  },
  {
    href: "/audit/cashiers",
    label: "Staff Sales",
    icon: Users,
    copy: "How much each cashier sold",
  },
  {
    href: "/audit/drawer",
    label: "Cash Count",
    icon: Banknote,
    copy: "Match till cash to what the system expects",
  },
  {
    href: "/audit/exceptions",
    label: "Problems to Check",
    icon: AlertTriangle,
    copy: "Odd sales that need a second look",
  },
];

function LiveBadge({ live, updatedAt }: { live: boolean; updatedAt: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
          live
            ? "bg-pos-success-soft text-pos-success"
            : "bg-pos-surface-muted text-pos-ink-muted"
        }`}
      >
        <Radio size={12} className={live ? "animate-pulse" : ""} />
        {live ? "Live" : "Reconnecting…"}
      </span>
      <span className="text-pos-ink-faint">
        Updated{" "}
        {new Date(updatedAt).toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    </div>
  );
}

function DayReportPanel({
  title,
  subtitle,
  report,
}: {
  title: string;
  subtitle: string;
  report: AuditSnapshot["x"];
}) {
  return (
    <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
      <header className="mb-4">
        <h2 className="font-semibold text-pos-ink">{title}</h2>
        <p className="mt-1 text-sm text-pos-ink-muted">{subtitle}</p>
      </header>
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-pos-surface-muted p-4 text-center">
        <div>
          <p className="text-xs text-pos-ink-muted">Sales total</p>
          <p className="mt-1 font-semibold">{naira(report.netMinor)}</p>
        </div>
        <div>
          <p className="text-xs text-pos-ink-muted">Sales count</p>
          <p className="mt-1 font-semibold">{report.transactions}</p>
        </div>
        <div>
          <p className="text-xs text-pos-ink-muted">Cash in till</p>
          <p className="mt-1 font-semibold">{naira(report.cashExpectedMinor)}</p>
        </div>
      </div>
      <div className="mt-4">
        <TableShell columns={["Payment", "Count", "Amount"]} minWidth={280}>
          {report.tenders.length === 0 ? (
            <EmptyRow colSpan={3} message="No sales yet today." />
          ) : (
            report.tenders.map((row) => (
              <tr key={row.tender} className="border-b border-pos-border/60">
                <td className="px-4 py-2.5 font-medium capitalize">{row.tender}</td>
                <td className="px-4 py-2.5">{row.count}</td>
                <td className="px-4 py-2.5">{naira(row.totalMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
      {typeof report.closed === "boolean" ? (
        <p className={`mt-3 text-sm ${report.closed ? "text-pos-success" : "text-pos-warning"}`}>
          {report.closed
            ? "Sales have slowed — you can count the cash."
            : "Sales are still coming in — numbers update live."}
        </p>
      ) : null}
    </section>
  );
}

export function AuditPages({ variant }: { variant: AuditVariant }) {
  const { data, live, ready } = useLiveAudit();
  const [search, setSearch] = useState("");
  const [counted, setCounted] = useState("");

  const query = search.trim().toLowerCase();

  const filteredTickets = useMemo(
    () =>
      data.tickets.filter((row) =>
        query
          ? [row.ticketId, row.tender, row.cashierName].some((value) =>
              value.toLowerCase().includes(query),
            )
          : true,
      ),
    [data.tickets, query],
  );

  const filteredExceptions = useMemo(
    () =>
      data.exceptions.filter((row) =>
        query
          ? [row.ticketId, row.detail, row.kind].some((value) => value.toLowerCase().includes(query))
          : true,
      ),
    [data.exceptions, query],
  );

  if (!ready) return <ManagerSkeleton variant="table" />;

  const dayLabel = prettyDay(data.day);
  const countedMinor = Math.round(parseFloat(counted || "0") * 100);
  const drawerVariance =
    counted === "" || !Number.isFinite(countedMinor)
      ? null
      : countedMinor - data.x.cashExpectedMinor;

  if (variant === "overview") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="Today's Summary"
          copy={`What happened on the tills for ${dayLabel}. Open any section below for more detail.`}
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sales today" value={naira(data.x.netMinor)} />
          <StatCard label="Number of sales" value={String(data.x.transactions)} />
          <StatCard label="Items sold" value={String(data.unitsSold)} />
          <StatCard
            label="Problems"
            value={String(data.exceptions.length)}
            hint={data.exceptions.length ? "Needs a look" : "Nothing flagged"}
          />
        </div>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm transition hover:bg-pos-primary-soft"
              >
                <Icon size={18} className="text-pos-primary" />
                <p className="mt-3 font-semibold text-pos-ink">{link.label}</p>
                <p className="mt-1 text-sm text-pos-ink-muted">{link.copy}</p>
              </Link>
            );
          })}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <DayReportPanel
            title="Mid-day Check"
            subtitle="Quick look at today’s sales. Safe to open anytime — it does not end the day."
            report={data.x}
          />
          <DayReportPanel
            title="End of Day"
            subtitle="Final sales figure for banking once the shop has gone quiet."
            report={data.z}
          />
        </div>
      </div>
    );
  }

  if (variant === "x-report") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="Mid-day Check"
          copy={`Sales so far on ${dayLabel}. You can open this anytime — it does not close the day.`}
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Sales total" value={naira(data.x.netMinor)} />
          <StatCard label="Number of sales" value={String(data.x.transactions)} />
          <StatCard label="Average sale" value={naira(data.avgTicketMinor)} />
        </div>
        <DayReportPanel
          title="Sales breakdown"
          subtitle="Updates when a till completes a sale."
          report={data.x}
        />
      </div>
    );
  }

  if (variant === "z-report") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="End of Day"
          copy={`Final sales for ${dayLabel}. Use this when you are ready to bank the money.`}
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Sales total" value={naira(data.z.netMinor)} />
          <StatCard label="Number of sales" value={String(data.z.transactions)} />
          <StatCard
            label="Shop status"
            value={data.z.closed ? "Quiet" : "Still selling"}
            hint={data.z.closed ? "No sales in the last 15 minutes" : "Sales are still coming in"}
          />
        </div>
        <DayReportPanel
          title="End of day breakdown"
          subtitle="Same live sales feed — marked quiet when selling slows down."
          report={data.z}
        />
      </div>
    );
  }

  if (variant === "tenders") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="Payment Methods"
          copy={`How today’s ${naira(data.x.netMinor)} was paid — cash, card, transfer, and more.`}
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <TableShell columns={["Payment", "Sales", "Amount", "Share"]}>
          {data.x.tenders.length === 0 ? (
            <EmptyRow colSpan={4} message="No payments recorded yet today." />
          ) : (
            data.x.tenders.map((row) => (
              <tr key={row.tender} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium capitalize">{row.tender}</td>
                <td className="px-4 py-3">{row.count}</td>
                <td className="px-4 py-3">{naira(row.totalMinor)}</td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {data.x.netMinor
                    ? `${Math.round((row.totalMinor / data.x.netMinor) * 100)}%`
                    : "—"}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "tickets") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="Sales List"
          copy="Every sale made today, listed one by one."
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <TableShell
          columns={["Time", "Sale no.", "Cashier", "Payment", "Items", "Total"]}
          toolbar={<Toolbar search={search} onSearch={setSearch} />}
        >
          {filteredTickets.length === 0 ? (
            <EmptyRow colSpan={6} message="No sales match your search." />
          ) : (
            filteredTickets.slice(0, 400).map((row) => (
              <tr key={row.ticketId} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3">
                  {new Date(row.paidAt).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.ticketId}</td>
                <td className="px-4 py-3">{row.cashierName}</td>
                <td className="px-4 py-3 capitalize">{row.tender}</td>
                <td className="px-4 py-3">
                  {row.lines} · {row.units}u
                </td>
                <td className="px-4 py-3 font-semibold">{naira(row.totalMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "cashiers") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="Staff Sales"
          copy="How much each cashier sold today."
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <TableShell columns={["Cashier", "Sales", "Amount", "Last sale"]}>
          {data.cashiers.length === 0 ? (
            <EmptyRow colSpan={4} message="No cashier sales yet today." />
          ) : (
            data.cashiers.map((row) => (
              <tr key={row.name} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.tickets}</td>
                <td className="px-4 py-3">{naira(row.totalMinor)}</td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {new Date(row.lastAt).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "drawer") {
    return (
      <div>
        <PageHeader
          kicker="Account · Audit"
          title="Cash Count"
          copy="Compare the cash in the till with what the system says should be there."
          action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="System expects" value={naira(data.x.cashExpectedMinor)} />
          <StatCard
            label="You counted"
            value={counted === "" ? "—" : naira(countedMinor)}
            hint="Type the physical count below"
          />
          <StatCard
            label="Difference"
            value={drawerVariance === null ? "—" : naira(drawerVariance)}
            hint={
              drawerVariance === null
                ? "Enter a count first"
                : drawerVariance === 0
                  ? "Matches"
                  : drawerVariance > 0
                    ? "Over"
                    : "Short"
            }
          />
        </div>
        <label className="mb-4 block max-w-sm text-sm font-medium text-pos-ink">
          Cash in the till (₦)
          <input
            type="number"
            min="0"
            step="0.01"
            value={counted}
            onChange={(event) => setCounted(event.target.value)}
            className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2.5 text-sm outline-none focus:border-pos-primary"
            placeholder={(data.x.cashExpectedMinor / 100).toFixed(2)}
          />
        </label>
        <TableShell columns={["Payment", "Count", "Amount"]}>
          {data.x.tenders.length === 0 ? (
            <EmptyRow colSpan={3} message="No payments split yet." />
          ) : (
            data.x.tenders.map((row) => (
              <tr key={row.tender} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium capitalize">{row.tender}</td>
                <td className="px-4 py-3">{row.count}</td>
                <td className="px-4 py-3">{naira(row.totalMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  // exceptions
  return (
    <div>
      <PageHeader
        kicker="Account · Audit"
        title="Problems to Check"
        copy="Odd sales from today — zero totals, missing items, very large sales, or refund-like amounts."
        action={<LiveBadge live={live} updatedAt={data.updatedAt} />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Problems found" value={String(data.exceptions.length)} />
        <StatCard
          label="Zero sales"
          value={String(data.exceptions.filter((row) => row.kind === "zero").length)}
        />
        <StatCard
          label="Very large sales"
          value={String(data.exceptions.filter((row) => row.kind === "high").length)}
        />
      </div>
      <TableShell
        columns={["Time", "Type", "Sale no.", "What happened", "Amount"]}
        toolbar={<Toolbar search={search} onSearch={setSearch} />}
      >
        {filteredExceptions.length === 0 ? (
          <EmptyRow colSpan={5} message="Nothing flagged — looking good." />
        ) : (
          filteredExceptions.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60">
              <td className="whitespace-nowrap px-4 py-3">
                {new Date(row.at).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 capitalize">{row.kind.replace("-", " ")}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.ticketId}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.detail}</td>
              <td className="px-4 py-3">{naira(row.amountMinor)}</td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
