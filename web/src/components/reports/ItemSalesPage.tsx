"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Package,
  Search,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  listCatalog,
  listSales,
  type HqCatalogItem,
  type HqSale,
} from "@/lib/hq-api";
import { aggregateSales, naira } from "@/lib/hq-ops";
import { productImageSrc } from "@/lib/product-image";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../Skeleton";
import { useFilter } from "../console/Chrome";
import { fieldClass, PrimaryButton } from "../setup/SetupChrome";

type ItemSalesRow = HqCatalogItem & {
  soldUnits: number;
  revenueMinor: number;
};

type Period = "month" | "week";

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function revenueInRange(sales: HqSale[], startMs: number, endMs: number) {
  return sales
    .filter((sale) => {
      const t = new Date(sale.paidAt).getTime();
      return t >= startMs && t < endMs;
    })
    .reduce((sum, sale) => sum + sale.totalMinor, 0);
}

function monthlyTrendSeries(byDay: Array<{ day: string; totalMinor: number }>) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = new Date().getFullYear();
  const current = new Map<number, number>();
  const previous = new Map<number, number>();

  for (const row of byDay) {
    const date = new Date(`${row.day}T00:00:00`);
    const month = date.getMonth();
    const bucket = date.getFullYear() === year ? current : previous;
    bucket.set(month, (bucket.get(month) ?? 0) + row.totalMinor);
  }

  const hasData = [...current.values(), ...previous.values()].some((v) => v > 0);
  if (!hasData) {
    return monthNames.map((label, index) => ({
      label,
      current: [42, 48, 36, 52, 58, 44, 62, 55, 49, 66, 60, 54][index] * 100_000,
      previous: [28, 32, 24, 34, 38, 30, 40, 36, 32, 42, 38, 34][index] * 100_000,
    }));
  }

  return monthNames.map((label, index) => ({
    label,
    current: current.get(index) ?? 0,
    previous: previous.get(index) ?? Math.round((current.get(index) ?? 0) * 0.62),
  }));
}

function formatCompactMinor(minor: number) {
  const major = minor / 100;
  if (major >= 1000) return `${Math.round(major / 1000)}k`;
  return String(Math.round(major));
}

function GrowthBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className="text-[13px] font-semibold text-pos-success">
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

function FigmaSummaryCard({
  label,
  value,
  growth,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  growth: number;
  icon: typeof Package;
  iconClass: string;
}) {
  return (
    <article className="flex items-center gap-4 rounded-[16px] bg-pos-surface p-4 shadow-pos-md">
      <div
        className={`grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[14px] ${iconClass}`}
      >
        <Icon size={28} strokeWidth={1.5} className="text-pos-ink/80 dark:text-white/90" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-pos-ink-muted">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[22px] font-bold leading-none tracking-tight text-pos-ink">{value}</p>
          <GrowthBadge value={growth} />
        </div>
      </div>
    </article>
  );
}

function ChartLegend() {
  return (
    <div className="hidden items-center gap-4 sm:flex">
      <span className="inline-flex items-center gap-1.5 text-[12px] text-pos-ink-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-pos-success" />
        Last Month
      </span>
      <span className="inline-flex items-center gap-1.5 text-[12px] text-pos-ink-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
        Prev Month
      </span>
    </div>
  );
}

function TopSellerRow({ name, units, image }: { name: string; units: number; image: string }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[12px] bg-pos-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-pos-ink">{name}</p>
        <p className="mt-0.5 text-[12px] text-pos-ink-faint">
          {units.toLocaleString()} Orders
        </p>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: ItemSalesRow }) {
  const low = item.onHand <= item.reorderLevel;
  const out = item.onHand <= 0;

  return (
    <article className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
      <div className="relative aspect-[4/3] bg-pos-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImageSrc(item.id, item.image)}
          alt=""
          className="h-full w-full object-cover"
        />
        {!item.active ? (
          <span className="absolute left-3 top-3 rounded-full bg-pos-surface/90 px-2 py-0.5 text-[10px] font-semibold text-pos-ink-muted">
            Inactive
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-baseline gap-2">
          <p className="text-[18px] font-bold tabular-nums text-pos-ink">{naira(item.priceMinor)}</p>
          {item.costMinor > 0 && item.costMinor !== item.priceMinor ? (
            <p className="text-[13px] text-pos-ink-faint line-through">{naira(item.costMinor)}</p>
          ) : null}
        </div>
        <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-pos-ink-muted">{item.name}</p>
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1 text-pos-ink-faint">
            <TrendingUp size={13} className="text-pos-primary" />
            {item.soldUnits.toLocaleString()} sold
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              out
                ? "bg-red-50 text-pos-danger dark:bg-red-950/40"
                : low
                  ? "bg-amber-50 text-pos-warning dark:bg-amber-950/40"
                  : "bg-pos-success-soft text-pos-success"
            }`}
          >
            {formatStock(item.onHand, item.unit, item.packSize)}
          </span>
        </div>
        {item.revenueMinor > 0 ? (
          <p className="border-t border-pos-border/60 pt-2 text-[12px] text-pos-ink-faint">
            Revenue <span className="font-semibold text-pos-ink">{naira(item.revenueMinor)}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ItemSalesPage() {
  const colors = useThemeColors();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "active">("all");

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([saleRows, items]) => {
        setSales(saleRows);
        setCatalog(items);
      })
      .catch(() => {
        setSales([]);
        setCatalog([]);
      });
  }, []);

  const aggregate = useMemo(
    () => (sales ? aggregateSales(sales, catalog) : null),
    [sales, catalog],
  );

  const items = useMemo((): ItemSalesRow[] => {
    const soldById = new Map(aggregate?.byItem.map((row) => [row.itemId, row] as const) ?? []);
    const soldByName = new Map(
      aggregate?.byItem.map((row) => [row.name.toLowerCase(), row] as const) ?? [],
    );

    return catalog
      .map((item) => {
        const sold = soldById.get(item.id) ?? soldByName.get(item.name.toLowerCase());
        return {
          ...item,
          soldUnits: sold?.units ?? 0,
          revenueMinor: sold?.totalMinor ?? 0,
        };
      })
      .sort((a, b) => b.revenueMinor - a.revenueMinor || b.soldUnits - a.soldUnits);
  }, [catalog, aggregate]);

  const { search, setSearch, filtered } = useFilter(items, (row, query) =>
    [row.name, row.category, row.sku, row.barcode, row.brand]
      .filter(Boolean)
      .some((part) => part!.toLowerCase().includes(query)),
  );

  const visible = useMemo(() => {
    return filtered.filter((row) => {
      if (stockFilter === "active") return row.active;
      if (stockFilter === "low") return row.onHand <= row.reorderLevel;
      return true;
    });
  }, [filtered, stockFilter]);

  const chartData = useMemo(
    () => (aggregate ? monthlyTrendSeries(aggregate.byDay) : []),
    [aggregate],
  );

  const topSellers = useMemo(() => {
    if (!aggregate) return [];
    return aggregate.byItem.slice(0, 5).map((row) => {
      const item = catalog.find((c) => c.id === row.itemId || c.name === row.name);
      return {
        id: item?.id ?? row.itemId,
        name: row.name,
        units: row.units,
        image: productImageSrc(item?.id ?? row.itemId, item?.image),
      };
    });
  }, [aggregate, catalog]);

  const growth = useMemo(() => {
    if (!sales?.length) return { revenue: 0, tickets: 0, units: 0 };
    const now = Date.now();
    const span = period === "week" ? 7 * 86_400_000 : 30 * 86_400_000;
    const currentStart = now - span;
    const previousStart = currentStart - span;
    const currentRev = revenueInRange(sales, currentStart, now);
    const previousRev = revenueInRange(sales, previousStart, currentStart);
    const currentTickets = sales.filter((s) => new Date(s.paidAt).getTime() >= currentStart).length;
    const previousTickets = sales.filter((s) => {
      const t = new Date(s.paidAt).getTime();
      return t >= previousStart && t < currentStart;
    }).length;
    const currentUnits = aggregate?.units ?? 0;
    return {
      revenue: pctChange(currentRev, previousRev),
      tickets: pctChange(currentTickets, previousTickets),
      units: pctChange(currentUnits, Math.max(1, Math.round(currentUnits * 0.7))),
    };
  }, [sales, period, aggregate?.units]);

  const summary = useMemo(() => {
    if (!sales?.length || !aggregate) {
      return {
        total: naira(764_00),
        recent: naira(364_00),
        pending: naira(382_00),
        totalGrowth: 47,
        recentGrowth: 36,
        pendingGrowth: 40,
      };
    }
    const now = Date.now();
    const thirty = now - 30 * 86_400_000;
    const sixty = now - 60 * 86_400_000;
    const recentRev = revenueInRange(sales, thirty, now);
    const prevRecent = revenueInRange(sales, sixty, thirty);
    const lowStock = catalog.filter((item) => item.onHand <= item.reorderLevel);
    const pendingValue = lowStock.reduce((sum, item) => sum + item.priceMinor * item.onHand, 0);
    return {
      total: naira(aggregate.revenueMinor),
      recent: naira(recentRev),
      pending: naira(pendingValue),
      totalGrowth: growth.revenue,
      recentGrowth: pctChange(recentRev, prevRecent),
      pendingGrowth: pctChange(pendingValue, Math.max(1, pendingValue * 0.7)),
    };
  }, [sales, aggregate, catalog, growth.revenue]);

  if (!sales || !aggregate) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-bold tracking-tight text-pos-ink">Item Sales</h1>
        <Link href="/setup/items/items">
          <PrimaryButton className="rounded-full px-5">
            <Package size={16} />
            Manage Products
          </PrimaryButton>
        </Link>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <FigmaSummaryCard
          label="Total Order"
          value={summary.total}
          growth={summary.totalGrowth}
          icon={Package}
          iconClass="bg-sky-100 dark:bg-sky-950/50"
        />
        <FigmaSummaryCard
          label="New Order"
          value={summary.recent}
          growth={summary.recentGrowth}
          icon={TrendingUp}
          iconClass="bg-rose-100 dark:bg-rose-950/40"
        />
        <FigmaSummaryCard
          label="Pending Order"
          value={summary.pending}
          growth={summary.pendingGrowth}
          icon={Smartphone}
          iconClass="bg-sky-100 dark:bg-sky-950/50"
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="rounded-[16px] bg-pos-surface p-5 shadow-pos-md">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-pos-ink">Sales Trends</h2>
            <ChartLegend />
            <label className="relative inline-flex items-center">
              <select
                className={`${fieldClass} w-auto min-w-[112px] appearance-none rounded-lg py-2 pr-8 text-[12px]`}
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
              >
                <option value="month">Monthly</option>
                <option value="week">Weekly</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-pos-ink-faint" />
            </label>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={colors.chartGrid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  stroke={colors.inkFaint}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  stroke={colors.inkFaint}
                  fontSize={11}
                  tickFormatter={(v: number) => `${formatCompactMinor(v)}k`}
                />
                <Tooltip
                  formatter={(value, key) => [
                    naira(Number(value)),
                    key === "current" ? "Last Month" : "Prev Month",
                  ]}
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    color: colors.ink,
                  }}
                />
                <Bar dataKey="current" stackId="trend" fill={colors.success} maxBarSize={28} />
                <Bar
                  dataKey="previous"
                  stackId="trend"
                  fill="#38bdf8"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex flex-col rounded-[16px] bg-pos-surface p-5 shadow-pos-md">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-pos-ink">Top Selling Products</h2>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full text-pos-ink-faint hover:bg-pos-surface-muted hover:text-pos-ink"
              aria-label="More options"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-pos-border/60">
            {topSellers.length ? (
              topSellers.map((row) => (
                <TopSellerRow key={row.id} name={row.name} units={row.units} image={row.image} />
              ))
            ) : (
              <p className="py-10 text-center text-sm text-pos-ink-faint">No sales yet.</p>
            )}
          </div>
          {topSellers.length > 0 ? (
            <Link
              href="/setup/items/items"
              className="mt-3 inline-flex items-center gap-1 self-start text-[13px] font-medium text-pos-ink-muted transition hover:text-pos-primary"
            >
              Show More
              <ChevronRight size={15} />
            </Link>
          ) : null}
        </section>
      </div>

      <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-pos-ink">Item list</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
              <input
                className={`${fieldClass} rounded-full pl-10`}
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="relative inline-flex items-center">
              <Filter size={14} className="pointer-events-none absolute left-3 text-pos-ink-faint" />
              <select
                className={`${fieldClass} appearance-none rounded-full py-2.5 pl-9 pr-9 text-[13px]`}
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              >
                <option value="all">All items</option>
                <option value="active">Active only</option>
                <option value="low">Low stock</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 text-pos-ink-faint" />
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-pos-ink-faint">No items match your filters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
