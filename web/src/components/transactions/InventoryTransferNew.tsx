"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ClipboardList,
  Loader2,
  Lock,
  Minus,
  Package,
  Plus,
  Repeat,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/lib/toast";
import { useLiveInventory } from "@/lib/live-inventory";
import { listStores } from "@/lib/hq-setup";
import {
  listMovements,
  listStockLevels,
  recordMovements,
  type StockLevel,
} from "@/lib/hq-ops";

type Line = { key: string; itemId: string; quantity: string };

const blankRow = () => ({
  key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemId: "",
  quantity: "",
});

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

function ItemSelect({
  value,
  levels,
  onSelect,
}: {
  value: string;
  levels: StockLevel[];
  onSelect: (itemId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = levels.find((level) => level.itemId === value);

  useEffect(() => {
    if (!value) return;
    const match = levels.find((level) => level.itemId === value);
    if (match) setQ(match.name);
  }, [value, levels]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const needle = q.trim().toLowerCase();
  const matches = needle
    ? levels
        .filter((level) =>
          `${level.name} ${level.sku ?? ""} ${level.barcode ?? ""}`.toLowerCase().includes(needle),
        )
        .slice(0, 80)
    : levels.slice(0, 80);

  return (
    <div ref={rootRef} className="relative">
      {selected ? (
        <button
          type="button"
          onClick={() => {
            onSelect("");
            setQ("");
          }}
          className="flex w-full items-center justify-between gap-2 rounded-[14px] border border-pos-primary/40 bg-pos-primary-soft/50 px-3 py-2 text-left transition hover:border-pos-primary"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pos-primary text-white">
              <Package size={13} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-pos-ink">{selected.name}</span>
              <span className="block truncate text-[11px] text-pos-ink-faint">
                {selected.sku || "— sku"} · {selected.unit}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-medium text-pos-ink-faint">Change</span>
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-[14px] border border-pos-border bg-pos-surface px-3 transition focus-within:border-pos-primary focus-within:ring-1 focus-within:ring-pos-primary">
            <Search size={14} className="shrink-0 text-pos-ink-faint" />
            <input
              className="w-full bg-transparent py-2.5 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
              placeholder="Search by name, sku or barcode…"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </div>
          {open && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-[14px] border border-pos-border/70 bg-pos-surface p-1.5 shadow-xl animate-in zoom-in-95">
              {matches.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-pos-ink-faint">
                  No items match “{q}”.
                </li>
              ) : (
                matches.map((level) => (
                  <li key={level.itemId}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(level.itemId);
                        setQ(level.name);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-pos-surface-muted"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pos-surface-muted text-pos-ink-muted">
                        <Package size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-pos-ink">{level.name}</span>
                        <span className="block truncate text-[11px] text-pos-ink-faint">
                          {level.sku || "— sku"} · {level.category || "—"} · {level.unit}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          level.onHand <= (level.reorderPoint || 0)
                            ? "bg-pos-danger/10 text-pos-danger"
                            : "bg-pos-surface-muted text-pos-ink-muted"
                        }`}
                      >
                        {level.onHand} on hand
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function InventoryTransferNew() {
  const { levels, live, ready, setLevels, setMovements } = useLiveInventory();
  const { session } = useAuth();
  const router = useRouter();

  const [from, setFrom] = useState("Main store");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Line[]>([blankRow()]);
  const [busy, setBusy] = useState(false);
  const [postError, setPostError] = useState("");

  const [locations, setLocations] = useState<string[]>(["Main store"]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listStockLevels(), listStores()])
      .then(([, stores]) => {
        if (cancelled) return;
        setLocations(
          Array.from(new Set(["Main store", ...stores.map((store) => store.name)])).sort((a, b) =>
            a.localeCompare(b),
          ),
        );
      })
      .catch((err) => toast.error(err, "Could not load locations"));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listStockLevels(), listMovements()])
      .then(([nextLevels, nextMovements]) => {
        if (cancelled) return;
        setLevels(nextLevels);
        setMovements(nextMovements);
      })
      .catch((err) => toast.error(err, "Could not load stock"));
    return () => {
      cancelled = true;
    };
  }, [setLevels, setMovements]);

  const levelsById = useMemo(() => new Map(levels.map((level) => [level.itemId, level])), [levels]);
  const onHandOf = (itemId: string) => levelsById.get(itemId)?.onHand ?? 0;
  const unitOf = (itemId: string) => levelsById.get(itemId)?.unit ?? "";

  const mergedManifest = useMemo(() => {
    const byId = new Map<string, number>();
    for (const row of rows) {
      if (!row.itemId) continue;
      const quantity = Math.round(Number(row.quantity)) || 0;
      if (quantity <= 0) continue;
      byId.set(row.itemId, (byId.get(row.itemId) ?? 0) + quantity);
    }
    return [...byId.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
  }, [rows]);

  const fillCount = rows.filter((row) => row.itemId && (Math.round(Number(row.quantity)) || 0) > 0).length;
  const manifestUnits = mergedManifest.reduce((sum, line) => sum + line.quantity, 0);
  const overStock = mergedManifest.some((line) => line.quantity > onHandOf(line.itemId));

  function updateRow(key: string, patch: Partial<Line>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function submit() {
    setPostError("");
    if (!to) {
      setPostError("Select a destination location.");
      return;
    }
    if (from === to) {
      setPostError("Source and destination cannot be the same.");
      return;
    }
    if (mergedManifest.length === 0) {
      setPostError("Add at least one item with a valid quantity.");
      return;
    }
    if (overStock) {
      setPostError("One or more items exceed what is on hand.");
      return;
    }
    setBusy(true);
    try {
      await recordMovements({
        type: "transfer",
        from,
        to,
        reason: note.trim() || undefined,
        staff: session?.name,
        lines: mergedManifest.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
      });
      toast.success("Transfer posted.");
      router.push("/transactions/stock/inventory-transfer");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Could not post transfer");
    } finally {
      setBusy(false);
    }
  }

  const customFieldClass =
    "w-full rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";
  const customSelectClass =
    "w-full cursor-pointer appearance-none rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 pr-10 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";

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
          <Link
            href="/transactions/stock/inventory-transfer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pos-ink-muted transition hover:text-pos-primary"
          >
            <ArrowLeft size={14} /> Back to transfers
          </Link>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Transaction • Stock
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
            New Inventory Transfer
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
            Move stock between locations — shelf to warehouse, branch to branch. Recorded to your staff
            account automatically.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
            <header className="flex items-center gap-3 border-b border-pos-border/60 px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
                <Warehouse size={16} />
              </span>
              <div>
                <h2 className="font-semibold text-pos-ink">Route</h2>
                <p className="text-xs text-pos-ink-muted">Where stock is leaving from and going to.</p>
              </div>
            </header>

            <div className="p-5">
              <div className="flex flex-col items-stretch gap-2 rounded-2xl border border-pos-border/70 bg-pos-surface-muted/40 p-4 sm:flex-row sm:items-start">
                <label className="block flex-1 text-[13px] font-medium text-pos-ink">
                  From
                  <select
                    className={`${customSelectClass} mt-1.5`}
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  >
                    {locations.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center justify-center gap-1 self-auto py-1 sm:mt-6 sm:py-0">
                  <button
                    type="button"
                    aria-label="Swap locations"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-pos-border/60 bg-pos-surface text-pos-ink-muted transition hover:rotate-180 hover:text-pos-primary"
                    onClick={() => {
                      setTo(from);
                      setFrom(to || from);
                    }}
                  >
                    <Repeat size={15} />
                  </button>
                  <span className="hidden text-pos-ink-faint sm:block">
                    <ArrowRight size={16} />
                  </span>
                </div>
                <label className="block flex-1 text-[13px] font-medium text-pos-ink">
                  To
                  <select
                    className={`${customSelectClass} mt-1.5 ${from === to && to ? "border-pos-danger/50" : ""}`}
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  >
                    <option value="">Choose a location…</option>
                    {locations
                      .filter((option) => option !== from)
                      .map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {to && from === to ? (
                <p className="mt-2 text-xs font-medium text-pos-danger">
                  Source and destination cannot be the same.
                </p>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
            <header className="flex items-center justify-between gap-3 border-b border-pos-border/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
                  <Boxes size={16} />
                </span>
                <div>
                  <h2 className="font-semibold text-pos-ink">Load manifest</h2>
                  <p className="text-xs text-pos-ink-muted">
                    Pick items and the quantities leaving {from}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-pos-primary-soft px-3.5 py-2 text-sm font-semibold text-pos-primary transition hover:bg-pos-primary hover:text-white"
                onClick={() => setRows((prev) => [...prev, blankRow()])}
              >
                <Plus size={14} /> Add item
              </button>
            </header>

            <div className="space-y-3 p-5">
              {rows.map((row) => {
                const qty = Math.round(Number(row.quantity)) || 0;
                const onHand = row.itemId ? onHandOf(row.itemId) : 0;
                const over = row.itemId && qty > onHand;
                return (
                  <div
                    key={row.key}
                    className={`rounded-[16px] border p-4 transition ${
                      over ? "border-pos-danger/40 bg-pos-danger/5" : "border-pos-border/60 bg-pos-surface-muted/40"
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_40px] sm:items-start">
                      <div className="min-w-0 text-[13px] font-medium text-pos-ink">
                        Item
                        <div className="mt-1.5">
                          <ItemSelect value={row.itemId} levels={levels} onSelect={(itemId) => updateRow(row.key, { itemId })} />
                        </div>
                      </div>

                      <div className="text-[13px] font-medium text-pos-ink">
                        Quantity
                        <div className="mt-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-pos-border/60 bg-pos-surface text-pos-ink transition hover:bg-pos-surface-muted"
                            onClick={() =>
                              updateRow(row.key, {
                                quantity: String(Math.max(0, qty - 1)),
                              })
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-[10px] border border-pos-border bg-pos-surface px-2 py-1.5 text-center text-sm font-medium tabular-nums text-pos-ink outline-none focus:border-pos-primary"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                          />
                          <button
                            type="button"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-pos-border/60 bg-pos-surface text-pos-ink transition hover:bg-pos-surface-muted"
                            onClick={() => updateRow(row.key, { quantity: String(qty + 1) })}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={rows.length === 1}
                        aria-label="Remove item"
                        className="grid h-10 w-10 shrink-0 place-items-center self-start rounded-[12px] border border-pos-border/60 bg-pos-surface text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger disabled:opacity-30 sm:mt-6"
                        onClick={() => {
                          if (rows.length > 1) setRows((prev) => prev.filter((r) => r.key !== row.key));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {row.itemId ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-pos-surface-muted px-2.5 py-1 text-[11px] font-semibold tabular-nums text-pos-ink-muted">
                          {onHand} {unitOf(row.itemId)} on hand
                        </span>
                        <span className="rounded-full bg-pos-primary-soft px-2.5 py-1 text-[11px] font-semibold tabular-nums text-pos-primary">
                          {onHand - qty} {unitOf(row.itemId)} after
                        </span>
                        {qty > 0 ? (
                          <button
                            type="button"
                            onClick={() => updateRow(row.key, { quantity: String(onHand) })}
                            className="text-[11px] font-semibold text-pos-primary underline-offset-2 hover:underline"
                          >
                            Set to all on hand
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {over ? (
                      <p className="mt-2 text-xs font-medium text-pos-danger">
                        Only {onHand} {unitOf(row.itemId)} on hand — you are short by {qty - onHand}.
                      </p>
                    ) : null}
                  </div>
                );
              })}

              {rows.every((row) => !row.itemId) ? (
                <p className="rounded-2xl bg-pos-surface-muted/50 px-4 py-6 text-center text-sm text-pos-ink-faint">
                  Nothing in the load yet — search and pick an item, or add multiple lines.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
            <header className="flex items-center gap-3 border-b border-pos-border/60 px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
                <ClipboardList size={16} />
              </span>
              <div>
                <h2 className="font-semibold text-pos-ink">Transfer summary</h2>
                <p className="text-xs text-pos-ink-muted">Review before posting.</p>
              </div>
            </header>

            <div className="space-y-4 p-5">
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">
                  Route
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-pos-surface-muted px-2.5 py-1 text-xs font-medium text-pos-ink">
                    {from}
                  </span>
                  <ArrowRight size={12} className="shrink-0 text-pos-ink-faint" />
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      to ? "bg-pos-primary-soft text-pos-primary" : "bg-pos-surface-muted text-pos-ink-faint"
                    }`}
                  >
                    {to || "Choose destination…"}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">
                  <ShieldCheck size={12} /> Recorded by
                </p>
                {session ? (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-pos-border/70 bg-pos-surface-muted/40 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-primary text-[12px] font-bold text-white">
                      {initialsOf(session.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-pos-ink">
                        {session.name}
                        <Lock size={11} className="shrink-0 text-pos-ink-faint" />
                      </p>
                      <p className="truncate text-[11px] text-pos-ink-faint">
                        {session.email} · {session.groupName || "Console"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-pos-surface-muted/50 px-3 py-3 text-xs text-pos-ink-faint">
                    Signed in account — auto-stamped.
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-pos-ink-faint">
                  The transfer is stamped to the account currently signed in.
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">
                  Reference note <span className="normal-case">(optional)</span>
                </p>
                <input
                  className={customFieldClass}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Weekend restock, customer order…"
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">
                  Manifest · {mergedManifest.length} item{mergedManifest.length === 1 ? "" : "s"}
                </p>
                {mergedManifest.length === 0 ? (
                  <p className="rounded-2xl bg-pos-surface-muted/50 px-3 py-3 text-xs text-pos-ink-faint">
                    Add items to see them here.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {mergedManifest.map((line) => {
                      const level = levelsById.get(line.itemId);
                      const over = line.quantity > onHandOf(line.itemId);
                      return (
                        <li
                          key={line.itemId}
                          className="flex items-center justify-between gap-2 rounded-xl border border-pos-border/60 bg-pos-surface-muted/40 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Package size={13} className="shrink-0 text-pos-ink-faint" />
                            <span className="min-w-0 truncate text-sm font-medium text-pos-ink">
                              {level?.name ?? line.itemId}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span
                              className={`inline-block text-sm font-bold tabular-nums ${
                                over ? "text-pos-danger" : "text-pos-ink"
                              }`}
                            >
                              {line.quantity}
                            </span>
                            <span className="ml-1.5 text-[11px] tabular-nums text-pos-ink-faint">
                              {level ? `${onHandOf(line.itemId)} → ${onHandOf(line.itemId) - line.quantity}` : ""}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-pos-surface-muted/60 px-4 py-3">
                <span className="text-xs font-semibold text-pos-ink-muted">Total units</span>
                <span className="text-base font-bold tabular-nums text-pos-ink">
                  {manifestUnits} {manifestUnits === 1 ? unitOf(mergedManifest[0]?.itemId ?? "") : ""}
                </span>
              </div>

              {postError ? (
                <p
                  className="rounded-[14px] bg-pos-danger/10 px-4 py-3 text-sm font-medium text-pos-danger"
                  role="alert"
                >
                  {postError}
                </p>
              ) : null}

              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                disabled={busy}
                onClick={submit}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={15} />}
                {busy ? "Posting…" : "Post transfer"}
              </button>

              {fillCount > 0 ? (
                <p className="flex items-center gap-1.5 text-[11px] text-pos-ink-faint">
                  <Boxes size={11} /> {fillCount} line{fillCount === 1 ? "" : "s"} filled · {manifestUnits}{" "}
                  {manifestUnits === 1 ? "unit" : "units"} moving {from} → {to || "…"} ·
                  {live ? " live stock" : " stock syncing"}
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}