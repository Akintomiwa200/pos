"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPaste,
  Dice5,
  History,
  PackageCheck,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { InventoryAdjustment } from "@/components/transactions/InventoryAdjustment";
import { useLiveInventory } from "@/lib/live-inventory";
import { naira, recordMovements, type StockLevel, type StockMovement } from "@/lib/hq-ops";
import { toast } from "@/lib/toast";
import { fieldClass } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";

type Mode = "overview" | "initial" | "random" | "adjustments" | "history";
type Scope = "all" | "category" | "sample";
type CountLine = { level: StockLevel; countedOnHand: number; variance: number };
type Run = { id: string; at: string; lines: StockMovement[] };

const PAGE_SIZE = 25;

const LINKS: Array<{ mode: Mode; label: string; href: string }> = [
  { mode: "overview", label: "Overview", href: "/stock-taking" },
  { mode: "initial", label: "Initial stock take", href: "/stock-taking/initial" },
  { mode: "random", label: "Random check", href: "/stock-taking/random" },
  { mode: "adjustments", label: "Adjustments", href: "/stock-taking/adjustments" },
  { mode: "history", label: "History", href: "/stock-taking/history" },
];

function buildRuns(movements: StockMovement[]): Run[] {
  const groups = new Map<string, StockMovement[]>();
  for (const move of movements) {
    if (move.type !== "count" && move.type !== "adjustment") continue;
    const key = move.runId || `${move.type}-${move.at.slice(0, 16)}-${move.staff || ""}`;
    groups.set(key, [...(groups.get(key) ?? []), move]);
  }
  return [...groups.entries()]
    .map(([id, lines]) => ({ id, lines, at: lines[0]?.at ?? "" }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

function runTotals(lines: StockMovement[]) {
  const increase = lines.reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
  const decrease = lines.reduce((sum, line) => sum + Math.max(0, -line.quantity), 0);
  return { increase, decrease };
}

function parseCountPaste(text: string, levels: StockLevel[]) {
  const counts: Record<string, string> = {};
  const unmatched: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(sku|barcode|item|product)/i.test(line) && /(qty|count|quantity)/i.test(line)) continue;

    const parts = line
      .split(/\t|,|;|\s{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      unmatched.push(line);
      continue;
    }

    const quantity = Number(parts[parts.length - 1]);
    if (!Number.isInteger(quantity) || quantity < 0) {
      unmatched.push(line);
      continue;
    }

    const query = parts.slice(0, -1).join(" ").toLowerCase();
    const exact = levels.find((level) =>
      [level.sku, level.barcode, level.name].some(
        (value) => value.trim().toLowerCase() === query,
      ),
    );
    const match =
      exact ??
      levels.find((level) =>
        [level.sku, level.barcode, level.name].some((value) =>
          value.trim().toLowerCase().includes(query),
        ),
      );

    if (!match) {
      unmatched.push(line);
      continue;
    }
    counts[match.itemId] = String(quantity);
  }

  return { counts, matched: Object.keys(counts).length, unmatched };
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof PackageCheck;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-pos-border bg-pos-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-pos-ink-muted">{label}</p>
          <p
            className={`mt-2 truncate text-2xl font-semibold tabular-nums ${
              tone === "good" ? "text-pos-success" : tone === "bad" ? "text-pos-danger" : "text-pos-ink"
            }`}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-pos-ink-faint">{hint}</p> : null}
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pos-surface-muted text-pos-ink-muted">
          <Icon size={17} />
        </span>
      </div>
    </div>
  );
}

function RunTable({ runs, emptyLabel }: { runs: Run[]; emptyLabel: string }) {
  if (!runs.length) {
    return (
      <div className="px-5 py-12 text-center text-sm text-pos-ink-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-pos-border bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
          <tr>
            <th className="px-5 py-3">Reference</th>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Recorded by</th>
            <th className="px-5 py-3 text-right">Items</th>
            <th className="px-5 py-3 text-right">Variance</th>
            <th className="px-5 py-3 text-right">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pos-border/60">
          {runs.map((run) => {
            const first = run.lines[0]!;
            const { increase, decrease } = runTotals(run.lines);
            return (
              <tr key={run.id} className="hover:bg-pos-surface-muted/30">
                <td className="px-5 py-3">
                  <p className="font-medium text-pos-ink">
                    {first.reason || (first.type === "count" ? "Stock count" : "Stock adjustment")}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-pos-ink-faint">{run.id}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-pos-ink-muted">
                  {new Date(run.at).toLocaleString("en-NG", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-3 text-pos-ink-muted">{first.staff || "—"}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pos-ink-muted">
                  {run.lines.length}
                </td>
                <td className="px-5 py-3 text-right text-xs font-semibold tabular-nums">
                  {increase > 0 ? (
                    <span className="text-pos-success">+{increase}</span>
                  ) : null}
                  {decrease > 0 ? (
                    <span className={increase > 0 ? "ml-2 text-pos-danger" : "text-pos-danger"}>
                      −{decrease}
                    </span>
                  ) : null}
                  {increase === 0 && decrease === 0 ? (
                    <span className="text-pos-ink-faint">No change</span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right">
                  <details className="inline-block text-left">
                    <summary className="cursor-pointer text-xs font-semibold text-pos-primary">
                      View {run.lines.length} line{run.lines.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-pos-border bg-pos-surface p-2">
                      {run.lines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-center justify-between gap-4 rounded px-2 py-1.5 text-xs even:bg-pos-surface-muted/40"
                        >
                          <span className="truncate text-pos-ink">{line.itemName}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-pos-ink-muted">
                            {line.quantity > 0 ? "+" : ""}
                            {line.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Overview({
  levels,
  movements,
  ready,
  refresh,
}: {
  levels: StockLevel[];
  movements: StockMovement[];
  ready: boolean;
  refresh: () => Promise<unknown>;
}) {
  const value = levels.reduce((sum, row) => sum + row.valueMinor, 0);
  const low = levels.filter((row) => row.onHand <= row.reorderPoint).length;
  const runs = useMemo(() => buildRuns(movements), [movements]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Products in catalogue"
          value={ready ? levels.length.toLocaleString() : "—"}
          hint="Items available to count"
          icon={PackageCheck}
        />
        <StatCard
          label="Stock value"
          value={ready ? naira(value, 0) : "—"}
          hint="At current cost price"
          icon={SlidersHorizontal}
        />
        <StatCard
          label="Below reorder level"
          value={ready ? low.toLocaleString() : "—"}
          hint="Need replenishment"
          icon={ArrowDownRight}
          tone={low > 0 ? "bad" : undefined}
        />
        <StatCard
          label="Count sessions"
          value={ready ? runs.length.toLocaleString() : "—"}
          hint="Posted counts and adjustments"
          icon={History}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-pos-border bg-pos-surface">
        <div className="border-b border-pos-border px-5 py-4">
          <h2 className="font-semibold text-pos-ink">Choose a counting method</h2>
          <p className="mt-1 text-xs text-pos-ink-muted">
            Pick the worksheet that matches how you are auditing stock.
          </p>
        </div>
        <div className="grid divide-y divide-pos-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              href: "/stock-taking/initial",
              title: "Full stock take",
              copy: "Count every product in the catalogue. Best for opening stock and periodic audits.",
              icon: ClipboardList,
              action: "Open full worksheet",
            },
            {
              href: "/stock-taking/random",
              title: "Random check",
              copy: "Spot-check a sample by category, or choose specific products from the list.",
              icon: Dice5,
              action: "Open random check",
            },
            {
              href: "/stock-taking/adjustments",
              title: "Adjustments",
              copy: "Record damage, expiry, loss, giveaways, and other approved ledger corrections.",
              icon: SlidersHorizontal,
              action: "Open adjustments",
            },
          ].map(({ href, title, copy, icon: Icon, action }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col p-5 transition hover:bg-pos-surface-muted/40"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-pos-primary-soft text-pos-primary">
                <Icon size={18} />
              </span>
              <h3 className="mt-4 font-semibold text-pos-ink">{title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-pos-ink-muted">{copy}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-pos-primary">
                {action}
                <ArrowRight
                  size={14}
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-pos-border bg-pos-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-pos-ink">Recent stock activity</h2>
            <p className="mt-1 text-xs text-pos-ink-muted">
              Latest posted counts and adjustments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh().catch(() => undefined)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-pos-ink-muted hover:text-pos-primary"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <Link href="/stock-taking/history" className="text-sm font-semibold text-pos-primary">
              View all
            </Link>
          </div>
        </div>
        <RunTable runs={runs.slice(0, 6)} emptyLabel="No counts or adjustments have been posted yet." />
      </section>
    </div>
  );
}

function CountWorkspace({
  mode,
  levels,
  ready,
  movements,
  refresh,
}: {
  mode: "initial" | "random";
  levels: StockLevel[];
  live: boolean;
  ready: boolean;
  movements: StockMovement[];
  refresh: () => Promise<unknown>;
}) {
  const { session } = useAuth();
  const initialized = useRef(false);
  const [scope, setScope] = useState<Scope>(mode === "initial" ? "all" : "sample");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sampleSize, setSampleSize] = useState("20");
  const [selected, setSelected] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!ready || initialized.current || !levels.length) return;
    initialized.current = true;
    if (mode === "initial") setSelected(levels.map((row) => row.itemId));
  }, [ready, levels, mode]);

  useEffect(() => {
    setPage(1);
  }, [search, category, scope]);

  const categories = useMemo(
    () => [...new Set(levels.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [levels],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return levels
      .filter((row) => {
        const matchesQuery =
          !query ||
          [row.name, row.sku, row.barcode, row.category].some((value) =>
            value.toLowerCase().includes(query),
          );
        return matchesQuery && (category === "all" || row.category === category);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [levels, search, category]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allShownSelected = filtered.length > 0 && filtered.every((row) => selectedSet.has(row.itemId));

  const countedRows = useMemo<CountLine[]>(
    () =>
      selected.flatMap((itemId) => {
        const level = levels.find((row) => row.itemId === itemId);
        const raw = counts[itemId];
        if (!level || raw === undefined || raw.trim() === "") return [];
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0) return [];
        return [{ level, countedOnHand: value, variance: value - level.onHand }];
      }),
    [selected, levels, counts],
  );

  const invalidCountIds = useMemo(
    () =>
      selected.filter((itemId) => {
        const raw = counts[itemId];
        if (raw === undefined || raw.trim() === "") return false;
        const value = Number(raw);
        return !Number.isInteger(value) || value < 0;
      }),
    [selected, counts],
  );

  const varianceCount = countedRows.filter((row) => row.variance !== 0).length;
  const pendingCount = selected.length - countedRows.length - invalidCountIds.length;
  const progress = selected.length ? Math.round((countedRows.length / selected.length) * 100) : 0;

  function toggleRow(itemId: string) {
    setSelected((current) => {
      if (current.includes(itemId)) {
        setCounts((next) => {
          const copy = { ...next };
          delete copy[itemId];
          return copy;
        });
        return current.filter((id) => id !== itemId);
      }
      return [...current, itemId];
    });
  }

  function toggleAllShown() {
    const shownIds = filtered.map((row) => row.itemId);
    setSelected((current) => {
      if (allShownSelected) {
        const remove = new Set(shownIds);
        setCounts((next) => {
          const copy = { ...next };
          for (const id of remove) delete copy[id];
          return copy;
        });
        return current.filter((id) => !remove.has(id));
      }
      return [...new Set([...current, ...shownIds])];
    });
  }

  function startFullCount() {
    setScope("all");
    setCategory("all");
    setSearch("");
    setSelected(levels.map((row) => row.itemId));
    setCounts({});
    setPage(1);
  }

  function fillWithSystemQuantity() {
    setCounts((current) => {
      const next = { ...current };
      for (const itemId of selected) {
        const level = levels.find((row) => row.itemId === itemId);
        if (level) next[itemId] = String(level.onHand);
      }
      return next;
    });
  }

  function clearCounts() {
    setCounts({});
  }

  function pickRandom() {
    const pool = filtered;
    const wanted = Math.max(1, Math.min(pool.length, Math.floor(Number(sampleSize) || 1)));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    setScope("sample");
    setSelected(shuffled.slice(0, wanted).map((row) => row.itemId));
    setCounts({});
  }

  function applyPaste() {
    const result = parseCountPaste(pasteText, levels);
    if (!result.matched) {
      toast.error("No matching products were found in that paste.");
      return;
    }
    setCounts((current) => ({ ...current, ...result.counts }));
    setSelected((current) => [...new Set([...current, ...Object.keys(result.counts)])]);
    setPasteOpen(false);
    setPasteText("");
    toast.success(
      `${result.matched} count${result.matched === 1 ? "" : "s"} applied${
        result.unmatched.length ? ` · ${result.unmatched.length} line(s) skipped` : ""
      }.`,
    );
  }

  async function postCounts() {
    if (!countedRows.length || posting) return;
    setPosting(true);
    try {
      await recordMovements({
        type: "count",
        reason: mode === "initial" ? "Full stock take" : "Random stock check",
        staff: session?.name,
        lines: countedRows.map(({ level, countedOnHand }) => ({
          itemId: level.itemId,
          quantity: 0,
          countedOnHand,
        })),
      });
      setCounts({});
      await refresh().catch(() => undefined);
      toast.success(
        `${countedRows.length} count${countedRows.length === 1 ? "" : "s"} posted${
          varianceCount ? ` with ${varianceCount} variance${varianceCount === 1 ? "" : "s"}` : ""
        }.`,
      );
    } catch (error) {
      toast.error(error, "Could not post stock counts");
    } finally {
      setPosting(false);
    }
  }

  const countRuns = buildRuns(movements).filter((run) =>
    run.lines.some((line) => line.type === "count"),
  ).length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Selected for count"
          value={selected.length.toLocaleString()}
          hint={`${levels.length.toLocaleString()} products in catalogue`}
          icon={ClipboardList}
        />
        <StatCard
          label="Counts entered"
          value={countedRows.length.toLocaleString()}
          hint={`${pendingCount} still to count`}
          icon={ClipboardCheck}
          tone={varianceCount > 0 ? "good" : undefined}
        />
        <StatCard
          label="Variances"
          value={varianceCount.toLocaleString()}
          hint={`${countRuns} count session${countRuns === 1 ? "" : "s"} posted`}
          icon={SlidersHorizontal}
          tone={varianceCount > 0 ? "bad" : undefined}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-pos-border bg-pos-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-pos-ink">
              {mode === "initial" ? "Full stock take worksheet" : "Random stock check worksheet"}
            </h2>
            <p className="mt-1 text-xs text-pos-ink-muted">
              Enter the physical quantity for each selected product. Only differences from the
              system quantity are posted to the ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={startFullCount}
            className="inline-flex items-center gap-2 rounded-lg border border-pos-border bg-pos-surface px-3.5 py-2 text-sm font-semibold text-pos-ink hover:bg-pos-surface-muted"
          >
            <ClipboardList size={15} /> Count all items
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-pos-border bg-pos-surface-muted/30 px-5 py-4">
          <label className="min-w-56 flex-1">
            <span className="mb-1 block text-xs font-medium text-pos-ink-muted">Find products</span>
            <span className="relative block">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU or barcode"
                className={`${fieldClass} w-full pl-9`}
              />
            </span>
          </label>
          <label className="min-w-40">
            <span className="mb-1 block text-xs font-medium text-pos-ink-muted">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`${fieldClass} w-full`}
            >
              <option value="all">All categories</option>
              {categories.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </label>
          <label className="w-28">
            <span className="mb-1 block text-xs font-medium text-pos-ink-muted">Sample size</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, filtered.length)}
              value={sampleSize}
              onChange={(event) => setSampleSize(event.target.value)}
              className={`${fieldClass} w-full`}
            />
          </label>
          <button
            type="button"
            onClick={pickRandom}
            disabled={!filtered.length}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-pos-border bg-pos-surface px-3.5 text-sm font-semibold text-pos-ink hover:bg-pos-surface-muted disabled:opacity-50"
          >
            <Dice5 size={15} /> Pick sample
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen((open) => !open)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-pos-border bg-pos-surface px-3.5 text-sm font-semibold text-pos-ink hover:bg-pos-surface-muted"
          >
            <ClipboardPaste size={15} /> Paste counts
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-pos-ink-muted">
            <input
              type="checkbox"
              checked={allShownSelected}
              onChange={toggleAllShown}
              className="h-4 w-4 rounded border-pos-border text-pos-primary"
            />
            Select all shown ({filtered.length})
          </label>
          <p className="text-xs text-pos-ink-faint">
            Page {safePage} of {totalPages} · {selected.length} selected
          </p>
        </div>

        {pasteOpen ? (
          <div className="border-b border-pos-border bg-pos-surface-muted/30 px-5 py-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-pos-ink-muted">
                Paste SKU or product name and quantity, one per line (tab or comma separated)
              </span>
              <textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                rows={4}
                placeholder={"SKU-001\t24\nSKU-002, 18"}
                className={`${fieldClass} w-full font-mono text-xs`}
              />
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteText("");
                }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-pos-ink-muted hover:bg-pos-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPaste}
                disabled={!pasteText.trim()}
                className="rounded-lg bg-pos-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Apply counts
              </button>
            </div>
          </div>
        ) : null}

        {invalidCountIds.length ? (
          <div className="flex items-center gap-2 border-b border-pos-border bg-pos-danger/5 px-5 py-3 text-xs text-pos-danger">
            <AlertCircle size={14} />
            Fix {invalidCountIds.length} invalid count{invalidCountIds.length === 1 ? "" : "s"}{" "}
            before posting. Counts must be whole numbers of zero or more.
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-pos-border bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
              <tr>
                <th className="w-12 px-4 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3 text-right">System qty</th>
                <th className="w-40 px-3 py-3">Physical count</th>
                <th className="px-5 py-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/60">
              {pageRows.map((row) => {
                const raw = counts[row.itemId] ?? "";
                const parsed = raw.trim() === "" ? null : Number(raw);
                const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 0);
                const variance = !invalid && parsed !== null ? parsed - row.onHand : null;
                return (
                  <tr
                    key={row.itemId}
                    className={selectedSet.has(row.itemId) ? "bg-pos-surface" : "bg-pos-surface-muted/20"}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(row.itemId)}
                        onChange={() => toggleRow(row.itemId)}
                        aria-label={`Include ${row.name}`}
                        className="h-4 w-4 rounded border-pos-border text-pos-primary"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-pos-ink">{row.name}</p>
                      <p className="mt-0.5 text-xs text-pos-ink-faint">
                        {row.sku || "No SKU"} · {row.category || "Uncategorised"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-pos-ink-muted">
                      {row.onHand} {row.unitLabel || row.unit}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={raw}
                        placeholder="—"
                        onChange={(event) =>
                          setCounts((current) => ({
                            ...current,
                            [row.itemId]: event.target.value,
                          }))
                        }
                        className={`${fieldClass} w-full text-right tabular-nums ${
                          invalid ? "border-pos-danger text-pos-danger" : ""
                        }`}
                      />
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-semibold tabular-nums ${
                        variance == null || variance === 0
                          ? "text-pos-ink-faint"
                          : variance > 0
                            ? "text-pos-success"
                            : "text-pos-danger"
                      }`}
                    >
                      {variance == null ? "—" : variance > 0 ? `+${variance}` : variance}
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-pos-ink-muted">
                    No products match this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pos-border px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-pos-border px-3 py-1.5 text-xs font-semibold text-pos-ink-muted disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-pos-border px-3 py-1.5 text-xs font-semibold text-pos-ink-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
          <div className="flex min-w-56 items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
              <div
                className="h-full rounded-full bg-pos-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-pos-ink-faint">{progress}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pos-border bg-pos-surface-muted/30 px-5 py-4">
          <p className="text-xs text-pos-ink-muted">
            {countedRows.length} entered · {varianceCount} variance
            {varianceCount === 1 ? "" : "s"}
            {pendingCount > 0 ? ` · ${pendingCount} still to count` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fillWithSystemQuantity}
              disabled={!selected.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted disabled:opacity-50"
            >
              <RefreshCw size={13} /> Fill system qty
            </button>
            <button
              type="button"
              onClick={clearCounts}
              disabled={!countedRows.length && !invalidCountIds.length}
              className="rounded-lg border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void postCounts()}
              disabled={posting || !countedRows.length || invalidCountIds.length > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-pos-primary px-4 py-2 text-sm font-semibold text-white shadow-pos-primary disabled:opacity-50"
            >
              <ClipboardCheck size={15} />
              {posting ? "Posting…" : `Post ${countedRows.length} count${countedRows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoryPage({ movements, ready, refresh }: {
  movements: StockMovement[];
  ready: boolean;
  refresh: () => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const runs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buildRuns(movements).filter((run) => {
      const first = run.lines[0];
      const matchesType = type === "all" || first?.type === type;
      const matchesQuery =
        !q ||
        run.id.toLowerCase().includes(q) ||
        (first?.reason ?? "").toLowerCase().includes(q) ||
        (first?.staff ?? "").toLowerCase().includes(q) ||
        run.lines.some((line) => line.itemName.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [movements, query, type]);

  return (
    <section className="overflow-hidden rounded-xl border border-pos-border bg-pos-surface">
      <div className="flex flex-wrap items-end gap-3 border-b border-pos-border px-5 py-4">
        <label className="min-w-56 flex-1">
          <span className="mb-1 block text-xs font-medium text-pos-ink-muted">Search runs</span>
          <span className="relative block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Reference, product, reason or staff"
              className={`${fieldClass} w-full pl-9`}
            />
          </span>
        </label>
        <label className="w-44">
          <span className="mb-1 block text-xs font-medium text-pos-ink-muted">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={`${fieldClass} w-full`}
          >
            <option value="all">All movements</option>
            <option value="count">Stock counts</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void refresh().catch(() => undefined)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-pos-border bg-pos-surface px-3.5 text-sm font-semibold text-pos-ink-muted hover:text-pos-primary"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {!ready ? (
        <ManagerSkeleton variant="table" />
      ) : (
        <RunTable runs={runs} emptyLabel="No stock runs match this view." />
      )}
    </section>
  );
}

export function StockTakingModule({ mode }: { mode: Mode }) {
  const { levels, movements, live, ready, refresh } = useLiveInventory();
  const title = LINKS.find((link) => link.mode === mode)?.label ?? "Stock taking";

  return (
    <div className="pb-8">
      <header className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
              Inventory
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">
              {mode === "overview" ? "Stock taking" : title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-pos-ink-muted">
              Count stock accurately, review differences, and keep every ledger change traceable.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-pos-border bg-pos-surface px-3 py-1.5 text-xs font-medium text-pos-ink-muted">
            <span
              className={`h-2 w-2 rounded-full ${live ? "bg-pos-success" : "bg-pos-warning"}`}
            />
            {live ? "Live updates on" : "Connecting…"}
          </span>
        </div>
        <nav
          className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-b border-pos-border"
          aria-label="Stock taking pages"
        >
          {LINKS.map((link) => (
            <Link
              key={link.mode}
              href={link.href}
              className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition ${
                link.mode === mode
                  ? "border-pos-primary text-pos-primary"
                  : "border-transparent text-pos-ink-muted hover:border-pos-border hover:text-pos-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {mode === "overview" ? (
        <Overview levels={levels} movements={movements} ready={ready} refresh={refresh} />
      ) : null}
      {mode === "initial" || mode === "random" ? (
        <CountWorkspace
          key={mode}
          mode={mode}
          levels={levels}
          live={live}
          ready={ready}
          movements={movements}
          refresh={refresh}
        />
      ) : null}
      {mode === "adjustments" ? <InventoryAdjustment /> : null}
      {mode === "history" ? (
        <HistoryPage movements={movements} ready={ready} refresh={refresh} />
      ) : null}
    </div>
  );
}
