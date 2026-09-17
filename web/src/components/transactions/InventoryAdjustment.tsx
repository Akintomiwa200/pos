"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Boxes,
  ClipboardList,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/lib/toast";
import { useLiveInventory } from "@/lib/live-inventory";
import {
  listMovements,
  listStockLevels,
  prettyDay,
  type StockMovement,
} from "@/lib/hq-ops";
import { StockAdjustmentModal } from "@/components/transactions/StockAdjustmentModal";
import {
  REASONS,
  REASON_ICONS,
  REASON_TONES,
  TONE_CHIP,
  TONE_TILE,
} from "@/components/transactions/stock-adjustment";

function LedgerRow({ move }: { move: StockMovement }) {
  const up = move.quantity > 0;
  const tone = REASON_TONES[move.reason ?? ""] ?? "sky";
  const Icon = REASON_ICONS[move.reason ?? ""] ?? ClipboardList;
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-pos-border/60 bg-pos-surface-muted/40 px-4 py-3">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${
          up ? "bg-pos-success-soft text-pos-success" : "bg-pos-danger/10 text-pos-danger"
        }`}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-pos-ink">{move.itemName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE_CHIP[tone]}`}>
            {move.reason ?? "Unspecified"}
          </span>
          <span className="text-[11px] text-pos-ink-faint">
            {new Date(move.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })} ·{" "}
            {move.staff || "staff"}
          </span>
        </div>
      </div>
      <span className={`shrink-0 text-sm font-bold tabular-nums ${up ? "text-pos-success" : "text-pos-danger"}`}>
        {up ? "+" : ""}
        {move.quantity}
      </span>
    </li>
  );
}

function StatCell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "bad";
}) {
  const valueClass =
    tone === "good" ? "text-pos-success" : tone === "bad" ? "text-pos-danger" : "text-pos-ink";
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pos-ink-faint">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-pos-ink-faint">{hint}</p>
    </div>
  );
}

export function InventoryAdjustment() {
  const { levels, movements, live, ready, setLevels, setMovements } = useLiveInventory();
  const { session } = useAuth();

  const [open, setOpen] = useState(false);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustItemId, setAdjustItemId] = useState("");

  const [query, setQuery] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [period, setPeriod] = useState("all");

  const customFieldClass =
    "w-full rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";
  const customSelectClass =
    "w-full cursor-pointer appearance-none rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 pr-10 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";

  const reload = useMemo(
    () =>
      async function reloadData() {
        try {
          const [loadedLevels, loadedMovements] = await Promise.all([listStockLevels(), listMovements()]);
          setLevels(loadedLevels);
          setMovements(loadedMovements);
        } catch (err) {
          toast.error(err, "Could not load stock");
        }
      },
    [setLevels, setMovements],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const adjustments = useMemo(() => movements.filter((move) => move.type !== "transfer"), [movements]);

  const stats = useMemo(() => {
    let net = 0;
    let count = 0;
    let loss = 0;
    let recover = 0;
    for (const move of adjustments) {
      net += move.quantity;
      count += 1;
      if (move.quantity < 0) loss += move.quantity;
      else recover += move.quantity;
    }
    return { net, count, loss, recover };
  }, [adjustments]);

  const reasonStats = useMemo(() => {
    const map = new Map<string, { count: number; units: number }>();
    for (const reason of REASONS) map.set(reason, { count: 0, units: 0 });
    for (const move of adjustments) {
      if (!move.reason) continue;
      const entry = map.get(move.reason) ?? { count: 0, units: 0 };
      entry.count += 1;
      entry.units += move.quantity;
      map.set(move.reason, entry);
    }
    return map;
  }, [adjustments]);

  const attention = useMemo(
    () =>
      [...levels]
        .filter((level) => level.onHand <= level.reorderPoint)
        .sort((a, b) => a.onHand - b.onHand)
        .slice(0, 6),
    [levels],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...adjustments]
      .filter(
        (move) =>
          !q ||
          [move.itemName, move.reason ?? ""].some((value) => value.toLowerCase().includes(q)),
      )
      .filter((move) => !filterReason || move.reason === filterReason)
      .filter((move) => {
        if (period === "all") return true;
        const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
        return Date.now() - new Date(move.at).getTime() <= days * 86_400_000;
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [adjustments, query, filterReason, period]);

  const grouped = useMemo(() => {
    const days = new Map<string, StockMovement[]>();
    for (const move of filtered) {
      const day = move.at.slice(0, 10);
      days.set(day, [...(days.get(day) ?? []), move]);
    }
    return [...days.entries()].slice(0, 10);
  }, [filtered]);

  if (!ready) {
    return (
      <div className="grid animate-pulse place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md">
        Loading inventory adjustments...
      </div>
    );
  }

  function openFor(reason: string) {
    setAdjustReason(reason);
    setAdjustItemId("");
    setOpen(true);
  }

  function openForItem(reason: string, itemId: string) {
    setAdjustReason(reason);
    setAdjustItemId(itemId);
    setOpen(true);
  }

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Transaction • Stock
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
            Inventory Adjustment
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
            Correct the stock ledger — write off damaged or expired stock, record theft, giveaway and
            short-ship, and reconcile physical counts. Refreshed in real-time.
          </p>
        </div>
        <button
          onClick={() => openFor("")}
          className="inline-flex h-10 items-center justify-center rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none"
        >
          New adjustment
        </button>
      </header>

      <div className="mb-6 overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="grid divide-y divide-pos-border/70 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <StatCell
            label="Net impact"
            value={(stats.net > 0 ? "+" : "") + stats.net}
            hint="Total quantity change"
            tone={stats.net > 0 ? "good" : stats.net < 0 ? "bad" : undefined}
          />
          <StatCell label="Adjustments" value={String(stats.count)} hint="Corrections posted" />
          <StatCell label="Write-offs" value={String(Math.abs(stats.loss))} hint="Stock removed" tone="bad" />
          <StatCell label="Recovered" value={String(stats.recover)} hint="Stock added" tone="good" />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section>
            <header className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pos-ink-muted">
                <Boxes size={15} className="text-pos-primary" /> Correct stock by reason
              </h2>
              <span className="text-xs text-pos-ink-faint">Tap a reason to start an adjustment</span>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {REASONS.map((reason) => {
                const Icon = REASON_ICONS[reason];
                const tone = REASON_TONES[reason];
                const row = reasonStats.get(reason) ?? { count: 0, units: 0 };
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => openFor(reason)}
                    className={`${TONE_TILE[tone]} group flex items-start justify-between gap-3 rounded-[18px] border bg-pos-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pos-md`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 text-current dark:bg-pos-surface/70">
                          <Icon size={17} />
                        </span>
                        <p className="truncate font-semibold">{reason}</p>
                      </div>
                      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                        {row.units !== 0 ? (row.units > 0 ? "+" : "") + row.units : "0"}
                        <span className="ml-1.5 text-xs font-medium opacity-60">
                          {row.count} logged
                        </span>
                      </p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-current transition group-hover:bg-white dark:bg-pos-surface/70">
                      <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {attention.length > 0 && (
            <section className="rounded-[20px] border border-pos-border/70 bg-pos-surface p-4 shadow-pos-sm">
              <header className="flex items-center gap-2">
                <TrendingDown size={15} className="text-pos-warning" />
                <h3 className="text-sm font-semibold text-pos-ink">Needs attention</h3>
                <span className="ml-auto rounded-full bg-pos-warning/15 px-2.5 py-0.5 text-[11px] font-bold text-pos-warning">
                  {attention.length}
                </span>
              </header>
              <ul className="mt-3 space-y-1.5">
                {attention.map((level) => (
                  <li key={level.itemId} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-pos-ink">{level.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-pos-ink-faint">
                      {level.onHand} on hand · reorder {level.reorderPoint}
                    </span>
                    <button
                      type="button"
                      onClick={() => openForItem("Count correction", level.itemId)}
                      className="shrink-0 text-xs font-semibold text-pos-primary hover:underline"
                    >
                      Count
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="rounded-[20px] bg-pos-surface shadow-pos-md">
          <header className="border-b border-pos-border/60 p-4">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-pos-primary" />
              <h3 className="text-sm font-semibold text-pos-ink">Live correction ledger</h3>
              <span
                className={`ml-auto h-2 w-2 rounded-full ${live ? "bg-pos-success" : "bg-pos-ink-faint"}`}
              />
            </div>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
                />
                <input
                  className={`${customFieldClass} pl-9`}
                  placeholder="Search item or reason…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={`${customSelectClass}`}
                  value={filterReason}
                  onChange={(event) => setFilterReason(event.target.value)}
                >
                  <option value="">All reasons</option>
                  {REASONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  className={`${customSelectClass}`}
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
          </header>

          <div className="p-4">
            {grouped.length === 0 ? (
              <div className="grid place-items-center rounded-2xl bg-pos-surface-muted/60 py-12 text-sm text-pos-ink-faint">
                No adjustments match this view yet.
              </div>
            ) : (
              <ol className="space-y-4">
                {grouped.map(([day, moves]) => (
                  <li key={day}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">
                      {prettyDay(day)}
                      <span className="ml-2 font-medium normal-case tracking-normal">
                        {moves.length} adjustment{moves.length === 1 ? "" : "s"}
                      </span>
                    </p>
                    <ul className="space-y-2">
                      {moves.map((move) => (
                        <LedgerRow key={move.id} move={move} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {open && (
        <StockAdjustmentModal
          initialReason={adjustReason}
          initialItemId={adjustItemId}
          recordedBy={session?.name ?? ""}
          onClose={() => setOpen(false)}
          onSaved={() => reload()}
        />
      )}
    </div>
  );
}