"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Scale, Search, Trash2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLiveInventory } from "@/lib/live-inventory";
import { recordMovements, listStockLevels, listMovements } from "@/lib/hq-ops";
import { prettyDay } from "@/lib/hq-ops";

type Line = { key: string; itemId: string; quantity: string; reason: string };

const REASONS = ["Damaged", "Expired", "Theft/loss", "Giveaway", "Count correction", "Supplier short-ship"];
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

function AdjustmentCard({ move }: { move: any }) {
  const isPositive = move.quantity > 0;
  return (
    <article className="rounded-[18px] border border-pos-border/70 bg-pos-surface p-4 shadow-pos-sm transition hover:border-pos-primary/40">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${isPositive ? 'bg-pos-success-soft text-pos-success' : 'bg-pos-danger/10 text-pos-danger'}`}>
          <Scale size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pos-ink">{move.itemName}</p>
          <p className="text-xs text-pos-ink-muted">
            {prettyDay(move.at.slice(0, 10))} at {new Date(move.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${isPositive ? 'bg-pos-success-soft text-pos-success' : 'bg-pos-danger/10 text-pos-danger'}`}>
          {isPositive ? "+" : ""}{move.quantity}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-pos-border/60 pt-3 text-[13px]">
        <span className="font-medium text-pos-ink">{move.reason || "Unspecified"}</span>
        <span className="text-xs text-pos-ink-faint">By {move.staff || "—"}</span>
      </div>
    </article>
  );
}

export function InventoryAdjustment() {
  const { levels, movements, live, ready, setLevels, setMovements } = useLiveInventory();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [staff, setStaff] = useState("");
  const [rows, setRows] = useState<Line[]>([{ key: `row-${Date.now()}`, itemId: "", quantity: "", reason: "" }]);
  const [postError, setPostError] = useState("");

  const [filterQuery, setFilterQuery] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");

  const reload = useMemo(
    () =>
      async function reloadData() {
        try {
          const [loadedLevels, loadedMovements] = await Promise.all([listStockLevels(), listMovements()]);
          setLevels(loadedLevels);
          setMovements(loadedMovements);
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

  const adjustments = useMemo(() => movements.filter((move) => move.type !== "transfer"), [movements]);

  const stats = useMemo(() => {
    const net = adjustments.reduce((sum, move) => sum + move.quantity, 0);
    const reasons = new Set(adjustments.map((move) => move.reason ?? "Unspecified"));
    return { net, count: adjustments.length, reasons: reasons.size };
  }, [adjustments]);

  const reasonOptions = useMemo(
    () => Array.from(new Set(adjustments.map((move) => move.reason).filter((reason): reason is string => Boolean(reason)))).sort(),
    [adjustments],
  );

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return [...adjustments]
      .filter((move) => !q || [move.itemName, move.reason ?? ""].some((value) => value.toLowerCase().includes(q)))
      .filter((move) => !filterReason || move.reason === filterReason)
      .filter((move) => {
        if (filterPeriod === "all") return true;
        const days = filterPeriod === "today" ? 1 : filterPeriod === "7d" ? 7 : 30;
        return Date.now() - new Date(move.at).getTime() <= days * 86_400_000;
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);
  }, [adjustments, filterQuery, filterReason, filterPeriod]);

  if (!ready) {
    return (
      <div className="grid place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md animate-pulse">
        Loading inventory adjustments...
      </div>
    );
  }

  async function submit() {
    setPostError("");
    const filled = rows.filter((row) => row.itemId && parseInt(row.quantity, 10) !== 0 && !isNaN(parseInt(row.quantity, 10)));
    if (filled.length === 0) {
      setPostError("Add at least one item with a non-zero quantity.");
      return;
    }
    if (filled.some((row) => !row.reason)) {
      setPostError("Please select a reason for all adjustments.");
      return;
    }
    setBusy(true);
    try {
      await recordMovements(
        filled.map((row) => ({
          type: parseInt(row.quantity, 10) > 0 ? "adjustment_up" : "adjustment_down",
          itemId: row.itemId,
          quantity: parseInt(row.quantity, 10),
          reason: row.reason,
          staff: staff || undefined,
        }))
      );
      await reload();
      setOpen(false);
      toast.success("Adjustment posted.");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Could not post adjustment");
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
            Inventory Adjustment
            <span className="flex items-center gap-1.5 rounded-full bg-pos-success-soft px-2.5 py-1 text-xs font-medium text-pos-success">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-pos-success opacity-75 ${live ? 'animate-ping' : ''}`}></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pos-success"></span>
              </span>
              {live ? "Live" : "Connecting"}
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Add or remove stock manually to fix discrepancies, log damages, or record waste. Refreshed in real-time.
          </p>
        </div>
        <button
          onClick={() => { setPostError(""); setRows([{ key: `row-${Date.now()}`, itemId: "", quantity: "", reason: "" }]); setOpen(true); }}
          className="inline-flex h-10 items-center justify-center rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none"
        >
          New adjustment
        </button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCell 
          label="Net Stock Impact" 
          value={(stats.net > 0 ? "+" : "") + stats.net} 
          hint="Total quantity change" 
          tone={stats.net > 0 ? "good" : stats.net < 0 ? "bad" : undefined}
        />
        <StatCell label="Adjustments Posted" value={String(stats.count)} hint="Individual transactions" />
        <StatCell label="Reasons Logged" value={String(stats.reasons)} hint="Distinct adjustment reasons" />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
          <input
            className={`${customFieldClass} pl-9`}
            placeholder="Search item or reason…"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
          />
        </div>
        <select
          className={`${customSelectClass} w-auto min-w-[180px]`}
          value={filterReason}
          onChange={(event) => setFilterReason(event.target.value)}
        >
          <option value="">All reasons</option>
          {reasonOptions.map((option) => (
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
          No inventory adjustments match this view yet.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((move) => (
            <AdjustmentCard key={move.id} move={move} />
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl flex flex-col rounded-[24px] bg-pos-surface shadow-2xl animate-in zoom-in-95">
            <header className="flex shrink-0 items-center justify-between border-b border-pos-border/60 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-pos-ink">New inventory adjustment</h2>
                <p className="mt-1 text-sm text-pos-ink-muted">Update stock counts and log the reason.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-pos-surface-muted text-pos-ink transition hover:bg-pos-border/60"
              >
                <X size={20} />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-h-[70vh]">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-pos-ink">
                  Date
                  <input type="date" className={`${customFieldClass} mt-1.5`} value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-pos-ink">
                  Recorded by
                  <input className={`${customFieldClass} mt-1.5`} value={staff} onChange={(event) => setStaff(event.target.value)} placeholder="Staff name" />
                </label>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-pos-ink-muted">
                    <Scale size={15} /> Products to adjust
                  </p>
                  <button type="button" className="text-sm font-medium text-pos-primary hover:underline" onClick={() => setRows((prev) => [...prev, { key: `row-${Date.now()}`, itemId: "", quantity: "", reason: "" }])}>
                    + Add another item
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row) => {
                    const qty = Math.round(Number(row.quantity)) || 0;
                    return (
                      <div key={row.key} className="flex flex-col gap-3 rounded-[16px] border border-pos-border/60 bg-pos-surface-muted/40 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
                          <label className="block w-40 text-[13px] font-medium text-pos-ink">
                            Quantity (+/-)
                            <div className="mt-1.5 flex items-center gap-1">
                              <button
                                type="button"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-pos-surface text-pos-ink hover:bg-pos-surface-muted border border-pos-border/60"
                                onClick={() => setRows(prev => prev.map(r => r.key === row.key ? { ...r, quantity: String((Math.round(Number(r.quantity))||0)-1) } : r))}
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                className={`w-full rounded-[10px] border border-pos-border bg-pos-surface px-2 py-1.5 text-center text-sm font-medium tabular-nums text-pos-ink outline-none focus:border-pos-primary`}
                                placeholder="0"
                                value={row.quantity}
                                onChange={(event) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, quantity: event.target.value } : r))}
                              />
                              <button
                                type="button"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-pos-surface text-pos-ink hover:bg-pos-surface-muted border border-pos-border/60"
                                onClick={() => setRows(prev => prev.map(r => r.key === row.key ? { ...r, quantity: String((Math.round(Number(r.quantity))||0)+1) } : r))}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </label>
                        </div>
                        <div className="flex items-end gap-3">
                          <label className="block flex-1 text-[13px] font-medium text-pos-ink">
                            Reason
                            <select
                              className={`${customSelectClass} mt-1.5`}
                              value={row.reason}
                              onChange={(event) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, reason: event.target.value } : r))}
                            >
                              <option value="">Select reason…</option>
                              {REASONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={rows.length === 1}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-pos-border/60 bg-pos-surface text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger disabled:opacity-30"
                            onClick={() => { if(rows.length > 1) setRows(prev => prev.filter(r => r.key !== row.key)) }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                {busy ? "Posting…" : "Post adjustment"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
