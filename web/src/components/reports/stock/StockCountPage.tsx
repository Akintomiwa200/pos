"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ListChecks, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog } from "@/lib/hq-api";
import { listMovements, listStockLevels, recordMovement, type StockLevel } from "@/lib/hq-ops";
import { formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

export function StockCountPage() {
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState(false);

  async function load() {
    const [rows, items, moves] = await Promise.all([listStockLevels(), listCatalog(), listMovements()]);
    setLevels(rows);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load stock");
      setLevels([]);
    });
  }, []);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      (levels ?? []).filter((row) =>
        query
          ? [row.name, row.sku, row.barcode, row.category].some((value) =>
              value.toLowerCase().includes(query),
            )
          : true,
      ),
    [levels, query],
  );

  const staged = useMemo(() => {
    return Object.entries(counts)
      .map(([itemId, value]) => ({
        itemId,
        counted: parseInt(value, 10),
        level: (levels ?? []).find((row) => row.itemId === itemId),
      }))
      .filter(
        (row): row is { itemId: string; counted: number; level: StockLevel } =>
          Number.isFinite(row.counted) && Boolean(row.level) && row.counted !== row.level!.onHand,
      )
      .sort((a, b) => Math.abs(b.counted - b.level.onHand) - Math.abs(a.counted - a.level.onHand));
  }, [counts, levels]);

  async function postCounts() {
    setPosting(true);
    try {
      let applied = 0;
      for (const row of staged) {
        await recordMovement({
          type: "count",
          itemId: row.itemId,
          countedOnHand: row.counted,
          reason: "Physical count",
        });
        applied += 1;
      }
      setCounts({});
      await load();
      toast.success(`${applied} count${applied === 1 ? "" : "s"} posted.`);
    } catch (err) {
      toast.error(err, "Could not post counts");
    } finally {
      setPosting(false);
    }
  }

  if (!levels) return <ManagerSkeleton variant="table" />;

  const totalStaged = staged.length;
  const netVariance = staged.reduce((sum, row) => sum + (row.counted - row.level.onHand), 0);

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Stock
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Stock count</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Physical count worksheet — enter what is on the shelf and post the adjustment.
          </p>
        </div>
        <button
          type="button"
          disabled={posting || totalStaged === 0}
          onClick={postCounts}
          className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {posting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
          Post {totalStaged || ""} adjustment{totalStaged === 1 ? "" : "s"}
        </button>
      </header>

      <label className="relative mb-4 block max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items to count…"
          className={`${fieldClass} w-full rounded-full pl-10`}
        />
      </label>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ minWidth: 620 }}>
              <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                <tr>
                  <th className="px-5 py-3.5">Item</th>
                  <th className="px-5 py-3.5 text-right">System</th>
                  <th className="w-32 px-5 py-3.5">Counted</th>
                  <th className="px-5 py-3.5 text-right">Variance</th>
                  <th className="w-12 px-3 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-pos-ink-faint">
                      <ListChecks size={28} className="mx-auto mb-2 opacity-40" />
                      {search ? "No items match your search." : "No items."}
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 200).map((row) => {
                    const typed = counts[row.itemId] ?? "";
                    const variance = typed === "" ? null : parseInt(typed, 10) - row.onHand;
                    return (
                      <tr key={row.itemId} className="hover:bg-pos-surface-muted/40">
                        <td className="px-5 py-3 text-pos-ink">
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-pos-ink-faint">
                            {row.category} · {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-pos-ink-muted">{row.onHand}</td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min="0"
                            value={typed}
                            placeholder={String(row.onHand)}
                            onChange={(event) =>
                              setCounts((current) => ({ ...current, [row.itemId]: event.target.value }))
                            }
                            className="w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-right tabular-nums outline-none focus:border-pos-primary"
                          />
                        </td>
                        <td
                          className={`px-5 py-3 text-right tabular-nums ${
                            variance === null
                              ? "text-pos-ink-faint"
                              : variance === 0
                                ? "text-pos-ink-muted"
                                : variance > 0
                                  ? "font-semibold text-pos-success"
                                  : "font-semibold text-pos-danger"
                          }`}
                        >
                          {variance === null ? "—" : variance > 0 ? `+${variance}` : variance}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {variance !== null && variance !== 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setCounts((current) => ({ ...current, [row.itemId]: "" }))
                              }
                              className="grid h-8 w-8 place-items-center rounded-full text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger"
                              aria-label="Clear count"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-pos-border px-5 py-3 text-xs text-pos-ink-faint">
            {filtered.length} rows available · {staged.length} awaiting posting
          </p>
        </section>

        <aside className="h-fit rounded-[20px] bg-pos-surface p-5 shadow-pos-md lg:sticky lg:top-4">
          <header className="flex items-center justify-between">
            <h2 className="font-semibold text-pos-ink">Pending adjustments</h2>
            <span className="rounded-full bg-pos-primary-soft px-3 py-1 text-xs font-semibold text-pos-primary">
              {totalStaged}
            </span>
          </header>

          {totalStaged === 0 ? (
            <p className="mt-4 rounded-2xl bg-pos-surface-muted/70 p-4 text-center text-sm text-pos-ink-faint">
              Enter a count that differs from the system and it will queue here.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {staged.map((row) => {
                  const diff = row.counted - row.level.onHand;
                  return (
                    <li key={row.itemId} className="rounded-2xl bg-pos-surface-muted/60 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-pos-ink">{row.level.name}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            diff > 0
                              ? "bg-emerald-100 text-pos-success dark:bg-emerald-950/50"
                              : "bg-rose-100 text-pos-danger dark:bg-rose-950/50"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-pos-ink-faint">
                        System {row.level.onHand} → counted {row.counted}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-pos-border/60 pt-4 text-sm">
                <span className="text-pos-ink-muted">Net variance</span>
                <span
                  className={`font-bold tabular-nums ${
                    netVariance === 0 ? "text-pos-ink" : netVariance > 0 ? "text-pos-success" : "text-pos-danger"
                  }`}
                >
                  {netVariance > 0 ? `+${netVariance}` : netVariance}
                </span>
              </div>
              <button
                type="button"
                disabled={posting}
                onClick={postCounts}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-40"
              >
                {posting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Post {totalStaged} adjustment{totalStaged === 1 ? "" : "s"}
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}