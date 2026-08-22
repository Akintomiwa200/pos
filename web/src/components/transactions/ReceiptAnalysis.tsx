"use client";

import { useEffect, useMemo, useState } from "react";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { aggregateSales, naira } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import {
  ChartCard,
  PageHeader,
  RankBarChart,
  SharePieChart,
  StatCard,
} from "../console/Chrome";

export function ReceiptAnalysis() {
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const aggregate = useMemo(() => (sales ? aggregateSales(sales) : null), [sales]);

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <PageHeader
        kicker="Transaction · Receipt"
        title="Analysis"
        copy="When people pay and who rings the sales — the shape of a trading day."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Revenue" value={naira(aggregate.revenueMinor)} />
        <StatCard label="Receipts issued" value={aggregate.tickets.toLocaleString()} />
        <StatCard label="Average basket" value={naira(aggregate.avgTicketMinor)} />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <ChartCard title="Sales by hour" subtitle="Peak trading windows">
          {() => (
            <RankBarChart
              money={false}
              data={aggregate.byHour.map((row) => ({
                label: `${String(row.hour).padStart(2, "0")}:00`,
                value: Math.round(row.totalMinor / 100),
              }))}
            />
          )}
        </ChartCard>
        <ChartCard title="Cashier share" subtitle="Revenue per cashier">
          {() => (
            <SharePieChart
              data={aggregate.byCashier.map((row) => ({ label: row.name, value: row.totalMinor }))}
            />
          )}
        </ChartCard>
        <ChartCard title="Category mix" subtitle="Where baskets concentrate">
          {() => (
            <RankBarChart
              data={aggregate.byCategory.slice(0, 8).map((row) => ({
                label: row.category,
                value: row.totalMinor,
              }))}
            />
          )}
        </ChartCard>
        <ChartCard title="Tender split" subtitle="How receipts were settled">
          {() => (
            <SharePieChart
              data={aggregate.byTender.map((row) => ({ label: row.tender, value: row.totalMinor }))}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
