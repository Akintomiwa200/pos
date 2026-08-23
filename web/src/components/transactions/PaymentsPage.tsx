"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { paymentFeed, type PaymentFeed as Feed } from "@/lib/hq-ops";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import {
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  TableShell,
} from "../console/Chrome";

export function PaymentsPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    paymentFeed()
      .then(setFeed)
      .catch((err) => {
        toast.error(err, "Could not load payments");
        setFeed({ transactions: [], settlements: [] });
      });
  }, []);

  const rows = useMemo(() => {
    if (!feed) return [];
    const query = search.trim().toLowerCase();
    const sorted = [...feed.transactions].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    return query
      ? sorted.filter((row) =>
          [row.ticketId, row.tender, row.cashierName].some((value) =>
            value.toLowerCase().includes(query),
          ),
        )
      : sorted;
  }, [feed, search]);

  if (!feed) return <ManagerSkeleton variant="table" />;

  const totalMinor = feed.settlements.reduce((sum, row) => sum + row.totalMinor, 0);

  return (
    <div>
      <PageHeader
        kicker="Transaction · Payments"
        title="Payments"
        copy="Every naira that came in, by tender — cash, transfer, card and anything else you accept."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total collected" value={naira(totalMinor)} />
        <StatCard label="Transactions" value={feed.transactions.length.toLocaleString()} />
        <StatCard
          label="Top tender"
          value={feed.settlements[0] ? `${feed.settlements[0].tender} · ${naira(feed.settlements[0].totalMinor)}` : "—"}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <TableShell columns={["Ticket", "Paid at", "Cashier", "Tender", "Amount"]} minWidth={560}>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} message="No payments recorded yet." />
          ) : (
            rows.slice(0, 200).map((row) => (
              <tr key={row.ticketId} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.ticketId}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {prettyDay(row.paidAt.slice(0, 10))} ·{" "}
                  {new Date(row.paidAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">{row.cashierName}</td>
                <td className="px-4 py-3 capitalize">
                  <span className="rounded-full bg-pos-primary-soft px-2.5 py-1 text-xs font-medium text-pos-primary">
                    {row.tender}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{naira(row.totalMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
        <Card title="Settlements" subtitle="Totals per tender across all time">
          <TableShell columns={["Tender", "Count", "Amount"]} minWidth={280}>
            {feed.settlements.length === 0 ? (
              <EmptyRow colSpan={3} />
            ) : (
              feed.settlements.map((row) => (
                <tr key={row.tender} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium capitalize">{row.tender}</td>
                  <td className="px-4 py-3">{row.count}</td>
                  <td className="px-4 py-3">{naira(row.totalMinor)}</td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      </div>
    </div>
  );
}
