"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, GitCommitHorizontal, Search, Shuffle } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { listMovements, naira, prettyDay, type StockMovement } from "@/lib/hq-ops";
import { formatMovementQty } from "@/lib/units";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

type Filter = "all" | StockMovement["type"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "transfer", label: "Transfers" },
  { id: "adjustment", label: "Adjustments" },
  { id: "count", label: "Counts" },
];

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function StockMovementPage() {
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([listMovements(), listCatalog()])
      .then(([rows, items]) => {
        setMovements(rows);
        setCatalog(items);
      })
      .catch((err) => {
        toast.error(err, "Could not load movements");
        setMovements([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!movements) return [];
    const query = search.trim().toLowerCase();
    return [...movements]
      .sort((a, b) => b.at.localeCompare(a.at))
      .filter((row) => (filter === "all" ? true : row.type === filter))
      .filter((row) =>
        query
          ? [row.itemName, row.reason ?? "", row.staff ?? ""].some((value) =>
              value.toLowerCase().includes(query),
            )
          : true,
      )
      .slice(0, 300);
  }, [movements, filter, search]);

  if (!movements) return <ManagerSkeleton variant="table" />;

  const counts = {
    all: movements.length,
    transfer: movements.filter((row) => row.type === "transfer").length,
    adjustment: movements.filter((row) => row.type === "adjustment").length,
    count: movements.filter((row) => row.type === "count").length,
  };

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Stock
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Stock movement</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Every transfer, adjustment and count posted against stock, newest first.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-pos-surface p-1 shadow-pos-md ring-1 ring-pos-border/60">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                filter === item.id
                  ? "bg-pos-primary text-white shadow-pos-primary"
                  : "text-pos-ink-muted hover:text-pos-ink"
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-xs opacity-70">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search item or reason…"
            className={`${fieldClass} w-full rounded-full pl-10`}
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <GitCommitHorizontal size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
            <p className="text-sm text-pos-ink-faint">No stock movements posted yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-pos-border/50">
            {rows.map((row, index) => {
              const item = catalog.find((entry) => entry.id === row.itemId);
              const inflow = row.quantity > 0;
              const isTransfer = row.type === "transfer";
              return (
                <article key={row.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-pos-surface-muted/40">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      isTransfer
                        ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
                        : inflow
                          ? "bg-emerald-50 text-pos-success dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-rose-50 text-pos-danger dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                  >
                    {isTransfer ? <Shuffle size={17} /> : inflow ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-pos-ink">
                      {row.itemName}
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isTransfer
                            ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
                            : "bg-pos-surface-muted text-pos-ink-muted"
                        }`}
                      >
                        {row.type}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-pos-ink-faint">
                      {prettyDay(row.at.slice(0, 10))} · {timeOf(row.at)}
                      {isTransfer ? (
                        <span className="ml-2">
                          {row.from || "—"} → {row.to || "—"}
                        </span>
                      ) : (
                        <span className="ml-2">
                          {row.reason || (typeof row.countedOnHand === "number" ? `Counted ${row.countedOnHand}` : "")}
                        </span>
                      )}
                      {row.staff ? <span className="ml-2 text-pos-primary">· {row.staff}</span> : null}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                      isTransfer ? "text-sky-600 dark:text-sky-300" : inflow ? "text-pos-success" : "text-pos-danger"
                    }`}
                  >
                    {formatMovementQty(row.quantity, item?.unit ?? "each", item?.unitLabel)}
                  </span>
                </article>
              );
            })}
          </div>
        )}
        {rows.length >= 300 ? (
          <p className="border-t border-pos-border px-5 py-3 text-xs text-pos-ink-faint">
            Showing the latest {rows.length} movements — refine filters to see more.
          </p>
        ) : null}
        {movements.length === 0 ? (
          <p className="border-t border-pos-border px-5 py-3 text-xs text-pos-ink-faint">
            Total value tracked in the journal: {naira(0)}
          </p>
        ) : null}
      </section>
    </div>
  );
}