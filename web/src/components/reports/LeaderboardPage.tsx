"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Axe,
  ChevronDown,
  Gem,
  Gift,
  MoreHorizontal,
  Trophy,
  Zap,
} from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import { listStores, type HqStore } from "@/lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { fieldClass } from "../setup/SetupChrome";

type LeaderTab = "customer" | "shop" | "worker";
type LeaderPeriod = "week" | "month" | "all";

type LeaderEntry = {
  id: string;
  name: string;
  handle: string;
  email?: string;
  avatar?: string;
  sellMinor: number;
  rating: number;
  gifts: number;
  gems: number;
  streak: number;
  repeats: number;
};

const TABS: { id: LeaderTab; label: string }[] = [
  { id: "customer", label: "Customer" },
  { id: "shop", label: "Shop" },
  { id: "worker", label: "Worker" },
];

const PERIODS: { id: LeaderPeriod; label: string }[] = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

const DEMO_LEADERBOARD: LeaderEntry[] = [
  {
    id: "lb-1",
    name: "Robert Calive",
    handle: "@Robert1234",
    email: "robert.calive@example.com",
    avatar: "https://i.pravatar.cc/150?u=robert-calive",
    sellMinor: 987_148_00,
    rating: 998_674,
    gifts: 18_000,
    gems: 17_000,
    streak: 16_000,
    repeats: 15_000,
  },
  {
    id: "lb-2",
    name: "Robert Calive",
    handle: "@Robert1234",
    email: "robert.calive@example.com",
    avatar: "https://i.pravatar.cc/150?u=robert-calive-2",
    sellMinor: 752_296_00,
    rating: 932_674,
    gifts: 14_000,
    gems: 13_000,
    streak: 12_000,
    repeats: 11_000,
  },
  {
    id: "lb-3",
    name: "Robert Calive",
    handle: "@Robert1234",
    email: "robert.calive@example.com",
    avatar: "https://i.pravatar.cc/150?u=robert-calive-3",
    sellMinor: 567_148_00,
    rating: 732_832,
    gifts: 12_000,
    gems: 11_000,
    streak: 10_000,
    repeats: 9_000,
  },
  {
    id: "lb-4",
    name: "Devon Lane",
    handle: "@Devon3456",
    email: "devon.lane@example.com",
    avatar: "https://i.pravatar.cc/150?u=devon-lane",
    sellMinor: 498_587_00,
    rating: 679_985,
    gifts: 9_500,
    gems: 8_800,
    streak: 8_200,
    repeats: 7_600,
  },
  {
    id: "lb-5",
    name: "Albert Flores",
    handle: "@Albert7890",
    email: "albert.flores@example.com",
    avatar: "https://i.pravatar.cc/150?u=albert-flores",
    sellMinor: 456_210_00,
    rating: 645_120,
    gifts: 8_900,
    gems: 8_100,
    streak: 7_400,
    repeats: 6_900,
  },
  {
    id: "lb-6",
    name: "Jane Cooper",
    handle: "@Jane2468",
    email: "jane.cooper@example.com",
    avatar: "https://i.pravatar.cc/150?u=jane-cooper",
    sellMinor: 412_880_00,
    rating: 601_443,
    gifts: 8_200,
    gems: 7_500,
    streak: 6_800,
    repeats: 6_200,
  },
  {
    id: "lb-7",
    name: "Leslie Alexander",
    handle: "@Leslie1357",
    email: "leslie.alexander@example.com",
    avatar: "https://i.pravatar.cc/150?u=leslie-alexander",
    sellMinor: 388_450_00,
    rating: 578_901,
    gifts: 7_800,
    gems: 7_100,
    streak: 6_400,
    repeats: 5_900,
  },
  {
    id: "lb-8",
    name: "Darrell Steward",
    handle: "@Darrell8642",
    email: "darrell.steward@example.com",
    avatar: "https://i.pravatar.cc/150?u=darrell-steward",
    sellMinor: 365_120_00,
    rating: 552_330,
    gifts: 7_400,
    gems: 6_700,
    streak: 6_000,
    repeats: 5_500,
  },
  {
    id: "lb-9",
    name: "Darrell Steward",
    handle: "@Darrell9753",
    email: "darrell.steward@example.com",
    avatar: "https://i.pravatar.cc/150?u=darrell-steward-2",
    sellMinor: 341_900_00,
    rating: 528_110,
    gifts: 7_000,
    gems: 6_300,
    streak: 5_700,
    repeats: 5_200,
  },
];

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function handleFor(name: string, id: string) {
  const slug = name.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
  return `@${slug}${1000 + (hashCode(id) % 9000)}`;
}

function avatarUrl(name: string, id: string) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(id || name)}`;
}

function formatRating(value: number) {
  return value.toLocaleString("en-US").replace(/,/g, " ");
}

function filterSalesByPeriod(sales: HqSale[], period: LeaderPeriod) {
  if (period === "all") return sales;
  const now = Date.now();
  const cutoff = period === "week" ? now - 7 * 86_400_000 : now - 30 * 86_400_000;
  return sales.filter((sale) => new Date(sale.paidAt).getTime() >= cutoff);
}

type LeaderBucket = {
  key: string;
  name: string;
  email?: string;
  sellMinor: number;
  orders: number;
  units: number;
};

function aggregateByDimension(
  sales: HqSale[],
  pick: (sale: HqSale) => { key: string; name: string } | null,
): LeaderBucket[] {
  const map = new Map<string, LeaderBucket>();
  for (const sale of sales) {
    const picked = pick(sale);
    if (!picked) continue;
    let bucket = map.get(picked.key);
    if (!bucket) {
      bucket = { key: picked.key, name: picked.name, sellMinor: 0, orders: 0, units: 0 };
      map.set(picked.key, bucket);
    }
    bucket.sellMinor += sale.totalMinor;
    bucket.orders += 1;
    bucket.units += (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
  }
  return [...map.values()].sort(
    (a, b) => b.sellMinor - a.sellMinor || b.orders - a.orders || a.name.localeCompare(b.name),
  );
}

function enrichFromDirectory(
  buckets: LeaderBucket[],
  directory: DirectoryRecord[],
  keyOf: (row: DirectoryRecord) => string,
) {
  const byName = new Map(directory.map((row) => [row.name.toLowerCase(), row]));
  const byKey = new Map(directory.map((row) => [keyOf(row).toLowerCase(), row]));
  for (const bucket of buckets) {
    const row = byKey.get(bucket.key) ?? byName.get(bucket.name.toLowerCase());
    if (row?.email) bucket.email = row.email;
    if (row?.name && row.name !== bucket.name) bucket.name = row.name;
  }
}

function toEntry(bucket: LeaderBucket): LeaderEntry {
  const seed = hashCode(bucket.key);
  return {
    id: bucket.key,
    name: bucket.name,
    handle: handleFor(bucket.name, bucket.key),
    email: bucket.email,
    avatar: avatarUrl(bucket.name, bucket.key),
    sellMinor: bucket.sellMinor,
    rating: Math.round(
      bucket.sellMinor / 100 + bucket.orders * 12_000 + bucket.units * 850,
    ),
    gifts: 8_000 + (seed % 12_000),
    gems: 7_000 + ((seed >> 3) % 11_000),
    streak: 6_000 + ((seed >> 5) % 10_000),
    repeats: 5_000 + ((seed >> 7) % 9_000),
  };
}

function resolveEntries(
  tab: LeaderTab,
  period: LeaderPeriod,
  sales: HqSale[],
  customers: DirectoryRecord[],
  staff: DirectoryRecord[],
  stores: HqStore[],
): LeaderEntry[] {
  const filtered = filterSalesByPeriod(sales, period);

  if (filtered.length > 0) {
    let buckets: LeaderBucket[] = [];

    if (tab === "customer") {
      buckets = aggregateByDimension(filtered, (sale) => {
        const name = sale.customerName?.trim();
        const loyalty = sale.loyaltyNumber?.trim();
        if (name) return { key: name.toLowerCase(), name };
        if (loyalty) return { key: loyalty.toLowerCase(), name: loyalty };
        return { key: "walk-in", name: "Walk-in" };
      });
      enrichFromDirectory(
        buckets,
        customers,
        (row) => row.extra?.loyaltyNumber?.toString?.() ?? row.phone ?? "",
      );
    } else if (tab === "worker") {
      buckets = aggregateByDimension(filtered, (sale) => {
        const name = sale.cashierName?.trim();
        return name
          ? { key: name.toLowerCase(), name }
          : { key: "staff", name: "Staff" };
      });
      enrichFromDirectory(buckets, staff, (row) => row.name);
    } else {
      buckets = aggregateByDimension(filtered, (sale) => {
        const name = sale.storeName?.trim() || sale.tillKey?.trim();
        return name
          ? { key: name.toLowerCase(), name }
          : { key: "other", name: "Other" };
      });
      const byName = new Map(stores.map((row) => [row.name.toLowerCase(), row]));
      for (const bucket of buckets) {
        const store = byName.get(bucket.name.toLowerCase());
        if (store) {
          bucket.name = store.name;
          bucket.email = `${store.name.toLowerCase().replace(/\s+/g, ".")}@shop.local`;
        }
      }
    }

    if (buckets.some((bucket) => bucket.sellMinor > 0)) {
      return buckets.filter((bucket) => bucket.sellMinor > 0).map(toEntry);
    }
  }

  return DEMO_LEADERBOARD;
}

function PodiumAvatar({
  src,
  name,
  rank,
  size = 52,
  featured = false,
}: {
  src?: string;
  name: string;
  rank: number;
  size?: number;
  featured?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`overflow-hidden rounded-full bg-pos-primary-soft ring-[3px] ${
          featured ? "ring-white/25" : "ring-pos-surface"
        }`}
        style={{ width: size, height: size }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-xs font-semibold text-pos-primary">
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className="absolute -bottom-1 left-1/2 grid h-[18px] min-w-[18px] -translate-x-1/2 place-items-center rounded-full bg-pos-success px-1 text-[10px] font-bold leading-none text-pos-surface">
        {rank}
      </span>
    </div>
  );
}

function TableAvatar({ src, name }: { src?: string; name: string }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-pos-primary-soft">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-[10px] font-semibold text-pos-primary">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  value,
  tone,
  featured = false,
  compact = false,
}: {
  icon: typeof Gift;
  value: number;
  tone: string;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold tabular-nums ${
        compact ? "" : "min-w-0 flex-1"
      } ${
        featured
          ? "bg-black/10 text-white dark:bg-white/10"
          : "bg-pos-surface-muted text-pos-ink-muted"
      }`}
    >
      <Icon size={12} className={tone} />
      {value.toLocaleString()}
    </span>
  );
}

function PodiumCard({
  entry,
  rank,
  featured = false,
}: {
  entry: LeaderEntry;
  rank: 1 | 2 | 3;
  featured?: boolean;
}) {
  const trophyClass = featured ? "text-amber-300" : "text-pos-primary";

  return (
    <article
      className={`relative flex flex-col rounded-[24px] px-5 pb-5 pt-5 shadow-pos-md ${
        featured
          ? "z-10 min-h-[248px] bg-pos-primary text-white shadow-pos-primary md:-translate-y-3 md:scale-[1.03]"
          : "min-h-[220px] bg-pos-surface text-pos-ink"
      }`}
    >
      <div className="flex items-start gap-3">
        <PodiumAvatar
          src={entry.avatar}
          name={entry.name}
          rank={rank}
          size={featured ? 56 : 50}
          featured={featured}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`truncate text-[15px] font-semibold ${featured ? "text-white" : "text-pos-ink"}`}>
            {entry.name}
          </p>
          <p className={`truncate text-[12px] ${featured ? "text-white/70" : "text-pos-ink-faint"}`}>
            {entry.handle}
          </p>
        </div>
        <Trophy size={featured ? 20 : 17} className={`shrink-0 ${trophyClass}`} />
      </div>

      <div
        className={`mt-5 flex items-start justify-between gap-4 border-t pt-4 ${
          featured ? "border-white/15" : "border-pos-border/70"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] ${featured ? "text-white/65" : "text-pos-ink-faint"}`}>Sell</p>
          <p className={`mt-0.5 truncate text-[14px] font-bold ${featured ? "text-white" : "text-pos-ink"}`}>
            {naira(entry.sellMinor)}
          </p>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className={`text-[11px] ${featured ? "text-white/65" : "text-pos-ink-faint"}`}>
            Ranked Rating
          </p>
          <p className={`mt-0.5 truncate text-[14px] font-bold ${featured ? "text-white" : "text-pos-ink"}`}>
            {formatRating(entry.rating)}
          </p>
        </div>
      </div>

      <div className={`mt-4 ${featured ? "grid grid-cols-4 gap-2" : "flex justify-center gap-2"}`}>
        <StatPill
          icon={Gift}
          value={entry.gifts}
          tone={featured ? "text-emerald-200" : "text-pos-success"}
          featured={featured}
          compact={!featured}
        />
        <StatPill
          icon={Gem}
          value={entry.gems}
          tone={featured ? "text-violet-200" : "text-pos-primary"}
          featured={featured}
          compact={!featured}
        />
        {featured ? (
          <>
            <StatPill icon={Zap} value={entry.streak} tone="text-amber-200" featured compact />
            <StatPill icon={Axe} value={entry.repeats} tone="text-emerald-200" featured compact />
          </>
        ) : null}
      </div>
    </article>
  );
}

export function LeaderboardPage() {
  const [tab, setTab] = useState<LeaderTab>("shop");
  const [period, setPeriod] = useState<LeaderPeriod>("week");
  const [ready, setReady] = useState(false);
  const [sales, setSales] = useState<HqSale[]>([]);
  const [customers, setCustomers] = useState<DirectoryRecord[]>([]);
  const [staff, setStaff] = useState<DirectoryRecord[]>([]);
  const [stores, setStores] = useState<HqStore[]>([]);

  useEffect(() => {
    Promise.all([
      listSales(),
      listDirectory("customers"),
      listDirectory("staff"),
      listStores(),
    ])
      .then(([saleRows, customerRows, staffRows, storeRows]) => {
        setSales(saleRows);
        setCustomers(customerRows);
        setStaff(staffRows);
        setStores(storeRows);
      })
      .finally(() => setReady(true));
  }, []);

  const entries = useMemo(
    () => resolveEntries(tab, period, sales, customers, staff, stores),
    [tab, period, sales, customers, staff, stores],
  );

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const nameColumn = tab === "shop" ? "Shop" : tab === "worker" ? "Worker" : "Customer";

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-6">
      <div className="mb-8 grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="lg:justify-self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
            Analytics · Leaderboards
          </p>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-tight text-pos-ink">
            Leader board
          </h1>
        </div>

        <div className="inline-flex justify-self-center rounded-full bg-pos-surface p-1 shadow-pos-sm ring-1 ring-pos-border/60">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-5 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-pos-primary text-white shadow-pos-primary"
                    : "text-pos-ink-muted hover:bg-pos-surface-muted hover:text-pos-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <label className="relative inline-flex items-center justify-self-start lg:justify-self-end">
          <select
            className={`${fieldClass} w-auto min-w-[140px] appearance-none rounded-full pr-10`}
            value={period}
            onChange={(event) => setPeriod(event.target.value as LeaderPeriod)}
          >
            {PERIODS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 text-pos-ink-faint" />
        </label>
      </div>

      {top3.length >= 3 ? (
        <div className="mb-6 grid items-end gap-4 md:grid-cols-3">
          <PodiumCard entry={top3[1]} rank={2} />
          <PodiumCard entry={top3[0]} rank={1} featured />
          <PodiumCard entry={top3[2]} rank={3} />
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[24px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-pos-border/60 bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                <th className="px-5 py-3.5">Rank</th>
                <th className="px-5 py-3.5">{nameColumn}</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Sell</th>
                <th className="px-5 py-3.5">Ranked Rating</th>
                <th className="px-5 py-3.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/45">
              {rest.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-pos-ink-faint">
                    No rankings yet for this period.
                  </td>
                </tr>
              ) : (
                rest.map((entry, index) => {
                  const rank = index + 4;
                  const highlighted = rank === 5;
                  return (
                    <tr
                      key={`${entry.id}-${rank}`}
                      className={highlighted ? "bg-pos-primary-soft" : "hover:bg-pos-surface-muted/60"}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <Trophy size={15} className="text-pos-primary" />
                          <span className="font-semibold tabular-nums text-pos-ink">
                            {String(rank).padStart(2, "0")}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <TableAvatar src={entry.avatar} name={entry.name} />
                          <span className="font-medium text-pos-ink">{entry.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-pos-ink-muted">{entry.email ?? "—"}</td>
                      <td className="px-5 py-4 font-semibold tabular-nums text-pos-ink">
                        {naira(entry.sellMinor)}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-pos-ink-muted">
                        {formatRating(entry.rating)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="inline-grid h-8 w-8 place-items-center rounded-full text-pos-ink-faint hover:bg-pos-surface-muted hover:text-pos-ink"
                          aria-label="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
