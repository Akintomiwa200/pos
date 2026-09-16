"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, MapPin, Package, Search, Trash2, X, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLiveInventory } from "@/lib/live-inventory";
import { listStores } from "@/lib/hq-setup";
import { recordMovements, listStockLevels, listMovements } from "@/lib/hq-ops";
import { prettyDay } from "@/lib/hq-ops";

type Line = { key: string; itemId: string; quantity: string };
const todayISO = () => new Date().toISOString().slice(0, 10);

function StatCell({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "good" | "bad" }) {
  const valueClass = tone === "good" ? "text-pos-success" : tone === "bad" ? "text-pos-danger" : "text-pos-ink";
  return (
    <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-ink-muted">{label}</p>
      <p className={`mt-2 truncate text-[26px] font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-pos-ink-faint">{hint}</p>
    </div>
  );
}

function TransferCard({ move }: { move: any }) {
  return (
    <article className="rounded-[18px] border border-pos-border/70 bg-pos-surface p-4 shadow-pos-sm transition hover:border-pos-primary/40">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-primary-soft text-pos-primary">
          <ArrowRightLeft size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pos-ink">{move.itemName}</p>
          <p className="text-xs text-pos-ink-muted">
            {prettyDay(move.at.slice(0, 10))} at {new Date(move.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide bg-pos-surface-muted text-pos-ink">
          Qty: {move.quantity}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-pos-border/60 pt-3 text-[13px]">
        <div className="flex items-center gap-2 font-medium text-pos-ink">
          <span>{move.from || "—"}</span>
          <ArrowRightLeft size={13} className="text-pos-ink-faint" />
          <span>{move.to || "—"}</span>
        </div>
        <span className="text-xs text-pos-ink-faint">By {move.staff || "—"}</span>
      </div>
    </article>
  );
}

export function InventoryTransfer() {
  const { levels, movements, live, ready, setLevels, setMovements } = useLiveInventory();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState("Main store");
  const [to, setTo] = useState("");
  const [staff, setStaff] = useState("");
  const [rows, setRows] = useState<Line[]>([{ key: `row-${Date.now()}`, itemId: "", quantity: "" }]);
  const [postError, setPostError] = useState("");

  const [locations, setLocations] = useState<string[]>(["Main store"]);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");

  const reload = useMemo(
    () =>
      async function reloadData() {
        try {
          const [loadedLevels, loadedMovements, stores] = await Promise.all([listStockLevels(), listMovements(), listStores()]);
          setLevels(loadedLevels);
          setMovements(loadedMovements);
          setLocations(
            Array.from(new Set(["Main store", ...stores.map((store) => store.name)])).sort((a, b) => a.localeCompare(b)),
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not load stock");
        }
      },
    [setLevels, setMovements],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const levelsById = useMemo(() => new Map(levels.map((level) => [level.itemId, level])), [levels]);
  const onHandOf = (itemId: string) => levelsById.get(itemId)?.onHand ?? 0;

  const transfers = useMemo(() => movements.filter((move) => move.type === "transfer"), [movements]);

  const stats = useMemo(() => {
    const units = transfers.reduce((sum, move) => sum + Math.abs(move.quantity), 0);
    const places = new Set<string>();
    for (const move of transfers) {
      if (move.from) places.add(move.from);
      if (move.to) places.add(move.to);
    }
    return { units, count: transfers.length, places: places.size };
  }, [transfers]);

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return [...transfers]
      .filter((move) => !q || move.itemName.toLowerCase().includes(q))
      .filter((move) => !filterLocation || move.from === filterLocation || move.to === filterLocation)
      .filter((move) => {
        if (filterPeriod === "all") return true;
        const days = filterPeriod === "today" ? 1 : filterPeriod === "7d" ? 7 : 30;
        return Date.now() - new Date(move.at).getTime() <= days * 86_400_000;
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);
  }, [transfers, filterQuery, filterLocation, filterPeriod]);

  if (!ready) {
    return (
      <div className="grid place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md animate-pulse">
        Loading inventory transfers...
      </div>
    );
  }

  async function submit() {
    setPostError("");
    const filled = rows.filter((row) => row.itemId && parseInt(row.quantity, 10) > 0);
    if (filled.length === 0) {
      setPostError("Add at least one item with a valid quantity.");
      return;
    }
    if (!to) {
      setPostError("Select a destination location.");
      return;
    }
    if (from === to) {
      setPostError("Source and destination cannot be the same.");
      return;
    }
    setBusy(true);
    try {
      await recordMovements(
        filled.map((row) => ({
          type: "transfer",
          itemId: row.itemId,
          quantity: parseInt(row.quantity, 10),
          from,
          to,
          staff: staff || undefined,
        }))
      );
      await reload();
      setOpen(false);
      toast.success("Transfer posted.");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Could not post transfer");
    } finally {
      setBusy(false);
    }
  }

  const customFieldClass = "w-full rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";
  const customSelectClass = "w-full cursor-pointer appearance-none rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 pr-10 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";

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
                <span className={`absolute inline-flex h-full w-full rounded-full bg-pos-success opacity-75 ${live ? 'animate-ping' : ''}`}></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pos-success"></span>
              </span>
              {live ? "Live" : "Connecting"}
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Move stock securely between locations — shelf to warehouse, branch to branch. Refreshed in real-time.
          </p>
        </div>
        <button
          onClick={() => { setPostError(""); setRows([{ key: `row-${Date.now()}`, itemId: "", quantity: "" }]); setOpen(true); }}
          className="inline-flex h-10 items-center justify-center rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none"
        >
          New transfer
        </button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCell label="Units Transferred" value={String(stats.units)} hint="Total items moved all time" />
        <StatCell label="Transfers Posted" value={String(stats.count)} hint="Individual transactions" />
        <StatCell label="Locations Involved" value={String(stats.places)} hint="Active movement routes" />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
          <input
            className={`${customFieldClass} pl-9`}
            placeholder="Search by item name…"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
          />
        </div>
        <select
          className={`${customSelectClass} w-auto min-w-[180px]`}
          value={filterLocation}
          onChange={(event) => setFilterLocation(event.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select
          className={`${customSelectClass} w-auto min-w-[140px]`}
          value={filterPeriod}
          onChange={(event) => setFilterPeriod(event.target.value)}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md">
          No inventory transfers match this view yet.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((move) => (
            <TransferCard key={move.id} move={move} />
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl flex flex-col rounded-[24px] bg-pos-surface shadow-2xl animate-in zoom-in-95">
            <header className="flex shrink-0 items-center justify-between border-b border-pos-border/60 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-pos-ink">New inventory transfer</h2>
                <p className="mt-1 text-sm text-pos-ink-muted">Pick the route, then add the products to move.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-pos-surface-muted text-pos-ink transition hover:bg-pos-border/60"
              >
                <X size={20} />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-h-[70vh]">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium text-pos-ink">
                  Date
                  <input type="date" className={`${customFieldClass} mt-1.5`} value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-pos-ink">
                  From location
                  <select className={`${customSelectClass} mt-1.5`} value={from} onChange={(event) => setFrom(event.target.value)}>
                    {locations.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-pos-ink">
                  To location
                  <select className={`${customSelectClass} mt-1.5`} value={to} onChange={(event) => setTo(event.target.value)}>
                    <option value="">Choose a location…</option>
                    {locations.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-pos-ink-muted">
                    <MapPin size={15} /> Products to move
                  </p>
                  <button type="button" className="text-sm font-medium text-pos-primary hover:underline" onClick={() => setRows((prev) => [...prev, { key: `row-${Date.now()}`, itemId: "", quantity: "" }])}>
                    + Add another item
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row) => {
                    const qty = Math.round(Number(row.quantity)) || 0;
                    const over = row.itemId && qty > onHandOf(row.itemId);
                    return (
                      <div key={row.key} className="flex flex-col gap-3 sm:flex-row sm:items-start rounded-[16px] border border-pos-border/60 bg-pos-surface-muted/40 p-4">
                        <label className="block flex-1 text-[13px] font-medium text-pos-ink">
                          Item
                          <select
                            className={`${customSelectClass} mt-1.5`}
                            value={row.itemId}
                            onChange={(event) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, itemId: event.target.value } : r))}
                          >
                            <option value="">Choose an item…</option>
                            {levels.map((level) => (
                              <option key={level.itemId} value={level.itemId}>
                                {level.name} — {level.onHand} on hand
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-start gap-3">
                          <label className="block w-28 text-[13px] font-medium text-pos-ink">
                            Quantity
                            <input
                              type="number"
                              min="1"
                              className={`${customFieldClass} mt-1.5`}
                              placeholder="1"
                              value={row.quantity}
                              onChange={(event) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, quantity: event.target.value } : r))}
                            />
                          </label>
                          <div className="mt-7 shrink-0">
                            <button
                              type="button"
                              disabled={rows.length === 1}
                              className="grid h-10 w-10 place-items-center rounded-[12px] border border-pos-border/60 bg-pos-surface text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger disabled:opacity-30"
                              onClick={() => { if(rows.length > 1) setRows(prev => prev.filter(r => r.key !== row.key)) }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {over && (
                          <div className="w-full text-xs font-medium text-pos-danger mt-[-4px] sm:mt-2">
                            Only {onHandOf(row.itemId)} on hand!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="block text-sm font-medium text-pos-ink">
                Recorded by
                <input className={`${customFieldClass} mt-1.5`} value={staff} onChange={(event) => setStaff(event.target.value)} placeholder="Name of staff handling transfer" />
              </label>

              {postError ? (
                <p className="mt-2 rounded-[14px] bg-pos-danger/10 px-4 py-3 text-sm font-medium text-pos-danger" role="alert">
                  {postError}
                </p>
              ) : null}
            </div>
            
            <footer className="shrink-0 rounded-b-[24px] border-t border-pos-border/60 bg-pos-surface p-6">
              <button
                className="inline-flex w-full h-11 items-center justify-center rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                disabled={busy}
                onClick={submit}
              >
                {busy ? "Posting…" : "Post transfer"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
