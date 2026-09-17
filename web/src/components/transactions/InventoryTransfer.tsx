"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Boxes,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Route,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useLiveInventory } from "@/lib/live-inventory";
import { listStores } from "@/lib/hq-setup";
import { listMovements, listStockLevels, prettyDay, type StockMovement } from "@/lib/hq-ops";

function StatCell({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pos-ink-faint">{label}</p>
        <p className="mt-0.5 truncate text-xl font-semibold tracking-tight tabular-nums text-pos-ink">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-pos-ink-faint">{hint}</p>
      </div>
    </div>
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function dateKeyOf(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function localDateKey(date: Date) {
  return dateKeyOf(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(key: string, delta: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dateKeyOf(date.getFullYear(), date.getMonth(), date.getDate());
}

function prettyDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const QUICK_RANGES = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

function QuickLabel({ value }: { value: Set<string> }) {
  if (value.size === 0) return "All dates";
  if (value.size === 1) return prettyDateKey([...value][0]);
  if (value.size <= 3) return [...value].sort().map(prettyDateKey).join(" · ");
  return `${value.size} dates`;
}

function MultiDatePicker({
  value,
  onChange,
}: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const today = localDateKey(new Date());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const cells: Array<string | null> = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(dateKeyOf(view.year, view.month, d));

  function toggle(day: string) {
    const next = new Set(value);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange(next);
  }

  function setQuick(quick: string) {
    if (quick === "all") {
      onChange(new Set());
      return;
    }
    const start = quick === "today" ? today : quick === "7d" ? addDays(today, -6) : addDays(today, -29);
    const set = new Set<string>();
    for (let day = start; day <= today; day = addDays(day, 1)) set.add(day);
    onChange(set);
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-2 rounded-full border py-2.5 pl-3.5 pr-3 text-sm font-medium transition focus:outline-none ${
          value.size > 0
            ? "border-pos-primary/60 bg-pos-primary-soft text-pos-primary"
            : "border-pos-border bg-pos-surface-muted/50 text-pos-ink-muted hover:text-pos-ink"
        }`}
      >
        <CalendarRange size={15} />
        <span className="tabular-nums">
          <QuickLabel value={value} />
        </span>
        <ChevronDown
          size={14}
          className={`text-pos-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[300px] rounded-[18px] border border-pos-border/70 bg-pos-surface p-3 shadow-2xl animate-in zoom-in-95">
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">
            Tap dates to select several
          </p>
          <div className="mb-3 flex items-center gap-1 rounded-full bg-pos-surface-muted/60 p-1">
            {QUICK_RANGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuick(option.value)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition ${
                  option.value === "all" && value.size === 0
                    ? "bg-pos-primary text-white shadow-pos-primary"
                    : "text-pos-ink-muted hover:text-pos-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              aria-label="Previous month"
              className="grid h-8 w-8 place-items-center rounded-full text-pos-ink-muted transition hover:bg-pos-surface-muted"
              onClick={() =>
                setView((current) =>
                  current.month === 0
                    ? { year: current.year - 1, month: 11 }
                    : { year: current.year, month: current.month - 1 },
                )
              }
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-pos-ink">
              {new Date(view.year, view.month, 1).toLocaleDateString("en-NG", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className="grid h-8 w-8 place-items-center rounded-full text-pos-ink-muted transition hover:bg-pos-surface-muted"
              onClick={() =>
                setView((current) =>
                  current.month === 11
                    ? { year: current.year + 1, month: 0 }
                    : { year: current.year, month: current.month + 1 },
                )
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-pos-ink-faint"
              >
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const selected = value.has(day);
              const isToday = day === today;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggle(day)}
                  className={`grid h-9 w-full place-items-center rounded-full text-sm tabular-nums transition ${
                    selected
                      ? "bg-pos-primary font-semibold text-white shadow-pos-primary"
                      : "text-pos-ink hover:bg-pos-surface-muted"
                  } ${isToday && !selected ? "ring-1 ring-inset ring-pos-primary/40" : ""}`}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-pos-border/60 pt-3 text-xs">
            <span className="font-medium text-pos-ink">
              {value.size === 0 ? "No dates selected" : `${value.size} date${value.size === 1 ? "" : "s"} selected`}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="font-semibold text-pos-ink-muted transition hover:text-pos-danger"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-pos-primary px-3.5 py-1.5 font-semibold text-white shadow-pos-primary transition hover:bg-pos-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryTransfer() {
  const { movements, live, ready, setLevels, setMovements } = useLiveInventory();

  const [locations, setLocations] = useState<string[]>(["Main store"]);
  const [query, setQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [dates, setDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([listStockLevels(), listMovements(), listStores()])
      .then(([loadedLevels, loadedMovements, stores]) => {
        if (cancelled) return;
        setLevels(loadedLevels);
        setMovements(loadedMovements);
        setLocations(
          Array.from(new Set(["Main store", ...stores.map((store) => store.name)])).sort((a, b) =>
            a.localeCompare(b),
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [setLevels, setMovements]);

  const transfers = useMemo(() => movements.filter((move) => move.type === "transfer"), [movements]);

  const stats = useMemo(() => {
    let units = 0;
    const places = new Set<string>();
    for (const move of transfers) {
      units += Math.abs(move.quantity);
      if (move.from) places.add(move.from);
      if (move.to) places.add(move.to);
    }
    return { units, count: transfers.length, places: places.size };
  }, [transfers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...transfers]
      .filter(
        (move) =>
          !q ||
          [move.itemName, move.from ?? "", move.to ?? "", move.staff ?? "", move.runId ?? ""].some(
            (value) => value.toLowerCase().includes(q),
          ),
      )
      .filter((move) => !filterLocation || move.from === filterLocation || move.to === filterLocation)
      .filter((move) => {
        if (dates.size === 0) return true;
        return dates.has(move.at.slice(0, 10));
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 300);
  }, [transfers, query, filterLocation, dates]);

  const recentlyMoved = useMemo(() => {
    const movedAt = new Map<string, number>();
    for (const move of transfers) {
      movedAt.set(move.itemName, Date.parse(move.at));
    }
    return [...movedAt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [transfers]);

  const hasActiveFilters = query.trim() !== "" || filterLocation !== "" || dates.size > 0;

  if (!ready) {
    return (
      <div className="grid animate-pulse place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md">
        Loading inventory transfers...
      </div>
    );
  }

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Transaction • Stock
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
            Inventory Transfer
            <span className="flex items-center gap-1.5 rounded-full bg-pos-success-soft px-2.5 py-1 text-xs font-medium text-pos-success">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-pos-success opacity-75 ${live ? "animate-ping" : ""}`}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pos-success" />
              </span>
              {live ? "Live" : "Connecting"}
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Complete ledger of stock moved between locations — every line from shelf to warehouse.
          </p>
        </div>
        <Link
          href="/transactions/stock/inventory-transfer/new"
          className="inline-flex h-10 items-center justify-center rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none"
        >
          Start new transfer
        </Link>
      </header>

      <div className="mb-6 overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="grid divide-y divide-pos-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatCell label="Units moved" value={String(stats.units)} hint="Total items shifted" Icon={ArrowRightLeft} />
          <StatCell label="Runs posted" value={String(stats.count)} hint="Individual transfer lines" Icon={Package} />
          <StatCell label="Active routes" value={String(stats.places)} hint="Locations on the move" Icon={Route} />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-[18px] border border-pos-border/70 bg-pos-surface p-3 shadow-pos-md lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
          <input
            className="w-full rounded-full border border-pos-border bg-pos-surface-muted/50 py-2.5 pl-11 pr-4 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary"
            placeholder="Search item, route or staff…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="relative lg:w-52">
          <MapPin size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
          <select
            className="w-full cursor-pointer appearance-none rounded-full border border-pos-border bg-pos-surface-muted/50 py-2.5 pl-10 pr-9 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary"
            value={filterLocation}
            onChange={(event) => setFilterLocation(event.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <MultiDatePicker value={dates} onChange={setDates} />
          <span className="rounded-full bg-pos-primary-soft px-3 py-1.5 text-xs font-semibold tabular-nums text-pos-primary">
            {rows.length} of {transfers.length}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilterLocation("");
                setDates(new Set());
              }}
              className="inline-flex items-center gap-1 rounded-full border border-pos-border/70 px-3 py-1.5 text-xs font-semibold text-pos-ink-muted transition hover:border-pos-danger/40 hover:bg-pos-danger/10 hover:text-pos-danger"
            >
              <X size={13} /> Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 900 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Transfer ID</th>
                <th className="px-5 py-3.5">Item</th>
                <th className="px-5 py-3.5">Route</th>
                <th className="px-5 py-3.5 text-right">Quantity</th>
                <th className="px-5 py-3.5">When</th>
                <th className="px-5 py-3.5">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-pos-ink-faint">
                    <Boxes size={28} className="mx-auto mb-2 opacity-40" />
                    {query || filterLocation || dates.size > 0
                      ? "No transfers match this view."
                      : "No transfers yet — use “Start new transfer” to move stock."}
                  </td>
                </tr>
              ) : (
                rows.map((move) => (
                  <tr key={move.id} className="transition hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-md bg-pos-surface-muted px-2 py-1 font-mono text-xs font-semibold tabular-nums text-pos-ink">
                        {move.runId ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-pos-ink">{move.itemName}</p>
                      <p className="mt-0.5 text-xs text-pos-ink-faint">line · {move.at.slice(0, 10)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-pos-surface-muted px-2.5 py-1 text-xs font-medium text-pos-ink">
                          {move.from ?? "—"}
                        </span>
                        <ArrowRight size={12} className="shrink-0 text-pos-ink-faint" />
                        <span className="rounded-full bg-pos-primary-soft px-2.5 py-1 text-xs font-medium text-pos-primary">
                          {move.to ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-pos-surface-muted px-2.5 py-1 text-sm font-bold tabular-nums text-pos-ink">
                        <Package size={12} className="text-pos-ink-faint" />
                        {move.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium text-pos-ink">{prettyDay(move.at.slice(0, 10))}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-pos-ink-faint">
                        {new Date(move.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-pos-ink-muted">
                        <UserRound size={13} className="text-pos-ink-faint" />
                        {move.staff || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-pos-border px-5 py-3 text-xs text-pos-ink-faint">
          {rows.length} of {transfers.length} transfer lines shown · newest first
        </p>
      </div>

      {recentlyMoved.length > 0 && (
        <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-pos-ink-faint">
            <Route size={14} className="text-pos-primary" /> Most recently moved
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentlyMoved.map(([name]) => (
              <span
                key={name}
                className="rounded-full border border-pos-border/70 bg-pos-surface-muted/50 px-3 py-1.5 text-xs font-medium text-pos-ink"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}