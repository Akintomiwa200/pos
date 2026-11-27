"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  Barcode,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  ClipboardPaste,
  Dice5,
  Download,
  ExternalLink,
  Filter,
  History,
  LayoutDashboard,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { InventoryAdjustment } from "@/components/transactions/InventoryAdjustment";
import { useLiveInventory } from "@/lib/live-inventory";
import { naira, recordMovements, type StockLevel, type StockMovement } from "@/lib/hq-ops";
import { toast } from "@/lib/toast";
import { ManagerSkeleton } from "@/components/Skeleton";

type Mode = "overview" | "initial" | "random" | "adjustments" | "history";
type Scope = "all" | "category" | "sample";
type FilterStatus = "all" | "pending" | "variance" | "matched";
type CountLine = {
  level: StockLevel;
  countedOnHand: number;
  variance: number;
  costImpactMinor: number;
};
type Run = { id: string; at: string; lines: StockMovement[] };

const PAGE_SIZE = 25;

const LINKS: Array<{ mode: Mode; label: string; href: string; icon: typeof ClipboardList }> = [
  { mode: "overview", label: "Overview", href: "/stock-taking", icon: LayoutDashboard },
  { mode: "initial", label: "Full stock take", href: "/stock-taking/initial", icon: ClipboardList },
  { mode: "random", label: "Random check", href: "/stock-taking/random", icon: Dice5 },
  { mode: "adjustments", label: "Adjustments", href: "/stock-taking/adjustments", icon: SlidersHorizontal },
  { mode: "history", label: "Count history", href: "/stock-taking/history", icon: History },
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
  return { increase, decrease, net: increase - decrease };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

/* -------------------------------------------------------------
 * Audit Session Detail Modal
 * ------------------------------------------------------------- */
function SessionDetailModal({
  run,
  onClose,
}: {
  run: Run;
  onClose: () => void;
}) {
  const first = run.lines[0];
  const { increase, decrease, net } = runTotals(run.lines);
  const isCount = first?.type === "count";

  const exportRunCsv = () => {
    const headers = ["Product Name", "Item ID", "Movement Type", "Quantity Change", "Staff", "Recorded At"];
    const rows = run.lines.map((l) => [
      `"${l.itemName.replace(/"/g, '""')}"`,
      `"${l.itemId}"`,
      l.type,
      l.quantity,
      `"${l.staff ?? ""}"`,
      l.at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(`audit-${run.id}.csv`, csv);
    toast.success("Audit session exported as CSV");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-pos-border bg-pos-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-11 place-items-center rounded-2xl ${
                isCount ? "bg-pos-primary/10 text-pos-primary" : "bg-pos-success/10 text-pos-success"
              }`}
            >
              {isCount ? <ClipboardList size={20} /> : <SlidersHorizontal size={20} />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-pos-ink">
                  {first?.reason || (isCount ? "Stock Count Audit" : "Stock Adjustment")}
                </h3>
                <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-pos-ink-muted">
                  {isCount ? "Physical Count" : "Adjustment"}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-pos-ink-faint">{run.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-pos-ink-faint hover:bg-pos-surface-muted hover:text-pos-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary metrics strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Date & Time</p>
            <p className="mt-1 text-xs font-medium text-pos-ink">
              {new Date(run.at).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Auditor / Staff</p>
            <p className="mt-1 text-xs font-semibold text-pos-ink truncate">{first?.staff || "System"}</p>
          </div>

          <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Items Audited</p>
            <p className="mt-1 text-sm font-bold text-pos-ink tabular-nums">{run.lines.length} lines</p>
          </div>

          <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-pos-ink-faint">Net Discrepancy</p>
            <p
              className={`mt-1 text-sm font-bold tabular-nums ${
                net > 0 ? "text-pos-success" : net < 0 ? "text-pos-danger" : "text-pos-ink-muted"
              }`}
            >
              {net > 0 ? `+${net}` : net} units
            </p>
          </div>
        </div>

        {/* Itemized Lines */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-pos-ink">Recorded Item Adjustments</p>
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-pos-border/80">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-pos-surface-muted/95 border-b border-pos-border backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-pos-ink">Product Name</th>
                  <th className="px-4 py-2.5 font-semibold text-pos-ink">Reason</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-pos-ink">Quantity Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/40 bg-pos-surface">
                {run.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-pos-surface-muted/30">
                    <td className="px-4 py-2.5 font-medium text-pos-ink">{line.itemName}</td>
                    <td className="px-4 py-2.5 text-pos-ink-muted">{line.reason || "Stock Count"}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                        line.quantity > 0
                          ? "text-pos-success"
                          : line.quantity < 0
                            ? "text-pos-danger"
                            : "text-pos-ink-muted"
                      }`}
                    >
                      {line.quantity > 0 ? `+${line.quantity}` : line.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between border-t border-pos-border/70 pt-4">
          <button
            type="button"
            onClick={exportRunCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3.5 py-2 text-xs font-semibold text-pos-ink hover:bg-pos-surface-muted"
          >
            <Download size={13} />
            <span>Export Session CSV</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-pos-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * Overview Component
 * ------------------------------------------------------------- */
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
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const value = levels.reduce((sum, row) => sum + row.valueMinor, 0);
  const low = levels.filter((row) => row.onHand <= row.reorderPoint).length;
  const runs = useMemo(() => buildRuns(movements), [movements]);

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-5 shadow-pos-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-pos-ink-muted">Catalogue Items</span>
            <span className="grid size-9 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
              <PackageCheck size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-pos-ink tabular-nums">
            {ready ? levels.length.toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-[11px] text-pos-ink-faint">Products registered in catalogue</p>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-5 shadow-pos-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-pos-ink-muted">Stock Valuation</span>
            <span className="grid size-9 place-items-center rounded-xl bg-pos-success/10 text-pos-success">
              <SlidersHorizontal size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-pos-ink tabular-nums">
            {ready ? naira(value, 0) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-pos-ink-faint">At current cost price</p>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-5 shadow-pos-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-pos-ink-muted">Low / Depleted Stock</span>
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                low > 0 ? "bg-pos-danger/10 text-pos-danger" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              <ArrowDownRight size={18} />
            </span>
          </div>
          <p
            className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${
              low > 0 ? "text-pos-danger" : "text-pos-ink"
            }`}
          >
            {ready ? low.toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-[11px] text-pos-ink-faint">Items at or below reorder level</p>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-5 shadow-pos-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-pos-ink-muted">Count Sessions</span>
            <span className="grid size-9 place-items-center rounded-xl bg-pos-surface-muted text-pos-ink-muted">
              <History size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-pos-ink tabular-nums">
            {ready ? runs.length.toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-[11px] text-pos-ink-faint">Audits and ledger adjustments posted</p>
        </div>
      </div>

      {/* Stocktaking Workflow Launchers */}
      <section className="rounded-[24px] border border-pos-border/80 bg-pos-surface p-6 shadow-pos-md">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-pos-ink">Stock Auditing Workflows</h2>
          <p className="text-xs text-pos-ink-muted">
            Select the count method suited for your store or warehouse audit schedule.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/stock-taking/initial",
              title: "Full Stock Take",
              copy: "Wall-to-wall physical inventory audit. Recommended for opening balances, month-ends, and periodic reconciliations.",
              icon: ClipboardList,
              badge: "100% Audit",
              action: "Launch Full Audit",
            },
            {
              href: "/stock-taking/random",
              title: "Random Cycle Check",
              copy: "Spot-check sample products or category batches without interrupting daily point-of-sale checkout operations.",
              icon: Dice5,
              badge: "Spot Check",
              action: "Start Spot Check",
            },
            {
              href: "/stock-taking/adjustments",
              title: "Stock Adjustments",
              copy: "Record damaged units, expired items, shrinkage, customer returns, or supplier corrections into the ledger.",
              icon: SlidersHorizontal,
              badge: "Manual Ledger",
              action: "Manage Adjustments",
            },
          ].map(({ href, title, copy, icon: Icon, badge, action }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col justify-between rounded-2xl border border-pos-border/80 p-5 transition hover:border-pos-primary/40 hover:bg-pos-primary-soft/40 hover:shadow-pos-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
                    <Icon size={20} />
                  </span>
                  <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[10px] font-semibold text-pos-ink-muted">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-3.5 text-sm font-bold text-pos-ink group-hover:text-pos-primary">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-pos-ink-muted">{copy}</p>
              </div>

              <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-pos-primary">
                <span>{action}</span>
                <ArrowRight size={13} className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Stock Activity Table */}
      <section className="rounded-[24px] border border-pos-border/80 bg-pos-surface p-6 shadow-pos-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border/60 pb-4">
          <div>
            <h2 className="text-base font-semibold text-pos-ink">Recent Audit & Adjustment Sessions</h2>
            <p className="text-xs text-pos-ink-muted">Review latest physical counts and inventory ledger updates.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh().catch(() => undefined)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-pos-ink-muted hover:text-pos-primary"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <Link href="/stock-taking/history" className="text-xs font-semibold text-pos-primary hover:underline">
              View all history →
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {runs.length === 0 ? (
            <div className="py-12 text-center text-xs text-pos-ink-faint">
              No stock counts or adjustments recorded yet.
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-pos-border text-[11px] font-semibold uppercase text-pos-ink-faint">
                <tr>
                  <th className="py-3 px-3">Session / Reason</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Auditor</th>
                  <th className="py-3 px-3 text-right">Items Audited</th>
                  <th className="py-3 px-3 text-right">Net Variance</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/50">
                {runs.slice(0, 8).map((run) => {
                  const first = run.lines[0];
                  const { increase, decrease, net } = runTotals(run.lines);
                  const isCount = first?.type === "count";
                  return (
                    <tr key={run.id} className="transition hover:bg-pos-surface-muted/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              isCount ? "bg-pos-primary" : "bg-pos-success"
                            }`}
                          />
                          <span className="font-semibold text-pos-ink">
                            {first?.reason || (isCount ? "Stock Count Audit" : "Stock Adjustment")}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-pos-ink-faint truncate max-w-[200px]">
                          {run.id}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-pos-ink-muted whitespace-nowrap">
                        {new Date(run.at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3 text-pos-ink">{first?.staff || "System"}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-pos-ink-muted">
                        {run.lines.length} lines
                      </td>
                      <td className="py-3 px-3 text-right font-semibold tabular-nums">
                        {increase > 0 && <span className="text-pos-success">+{increase}</span>}
                        {decrease > 0 && (
                          <span className={`${increase > 0 ? "ml-1.5" : ""} text-pos-danger`}>
                            −{decrease}
                          </span>
                        )}
                        {increase === 0 && decrease === 0 && (
                          <span className="text-pos-ink-faint">Matched (0)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRun(run)}
                          className="rounded-lg border border-pos-border px-2.5 py-1 text-[11px] font-semibold text-pos-ink hover:bg-pos-surface-muted"
                        >
                          View Lines
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedRun && <SessionDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </div>
  );
}

/* -------------------------------------------------------------
 * Count Workspace Component (Initial & Random)
 * ------------------------------------------------------------- */
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
  const [sampleSize, setSampleSize] = useState("25");
  const [selected, setSelected] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [posting, setPosting] = useState(false);
  const [scannerInput, setScannerInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    if (!ready || initialized.current || !levels.length) return;
    initialized.current = true;
    if (mode === "initial") setSelected(levels.map((row) => row.itemId));
  }, [ready, levels, mode]);

  useEffect(() => {
    setPage(1);
  }, [search, category, scope, filterStatus]);

  const categories = useMemo(
    () => [...new Set(levels.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [levels],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Computed counted line items
  const countedRows = useMemo<CountLine[]>(
    () =>
      selected.flatMap((itemId) => {
        const level = levels.find((row) => row.itemId === itemId);
        const raw = counts[itemId];
        if (!level || raw === undefined || raw.trim() === "") return [];
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0) return [];
        const variance = value - level.onHand;
        const unitCostMinor = level.onHand > 0 ? Math.round(level.valueMinor / level.onHand) : 0;
        const costImpactMinor = variance * unitCostMinor;
        return [{ level, countedOnHand: value, variance, costImpactMinor }];
      }),
    [selected, levels, counts],
  );

  const countedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of countedRows) map.set(c.level.itemId, c.countedOnHand);
    return map;
  }, [countedRows]);

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

  const varianceRows = countedRows.filter((r) => r.variance !== 0);
  const varianceCount = varianceRows.length;
  const netCostImpactMinor = varianceRows.reduce((sum, r) => sum + r.costImpactMinor, 0);
  const pendingCount = selected.length - countedRows.length - invalidCountIds.length;
  const matchedCount = countedRows.filter((r) => r.variance === 0).length;
  const progress = selected.length ? Math.round((countedRows.length / selected.length) * 100) : 0;

  // Filtered list
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return levels
      .filter((row) => {
        const matchesQuery =
          !query ||
          [row.name, row.sku, row.barcode, row.category].some((value) =>
            value.toLowerCase().includes(query),
          );
        const matchesCat = category === "all" || row.category === category;
        if (!matchesQuery || !matchesCat) return false;

        // Status filter
        if (filterStatus === "pending") {
          return selectedSet.has(row.itemId) && !countedMap.has(row.itemId);
        }
        if (filterStatus === "variance") {
          const counted = countedMap.get(row.itemId);
          return counted !== undefined && counted !== row.onHand;
        }
        if (filterStatus === "matched") {
          const counted = countedMap.get(row.itemId);
          return counted !== undefined && counted === row.onHand;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [levels, search, category, filterStatus, selectedSet, countedMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allShownSelected = filtered.length > 0 && filtered.every((row) => selectedSet.has(row.itemId));

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
    setFilterStatus("all");
    setSelected(levels.map((row) => row.itemId));
    setCounts({});
    setPage(1);
    toast.success(`Selected all ${levels.length} products for physical count.`);
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
    toast.success(`Populated physical count with system quantities for ${selected.length} items.`);
  }

  function clearCounts() {
    setCounts({});
    toast.info("Cleared all count inputs");
  }

  function stepCount(itemId: string, delta: number) {
    if (!selectedSet.has(itemId)) {
      setSelected((prev) => [...prev, itemId]);
    }
    setCounts((prev) => {
      const current = Number(prev[itemId] ?? 0);
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: String(next) };
    });
  }

  function matchSystemOnHand(itemId: string, onHand: number) {
    if (!selectedSet.has(itemId)) {
      setSelected((prev) => [...prev, itemId]);
    }
    setCounts((prev) => ({ ...prev, [itemId]: String(onHand) }));
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
    toast.success(`Selected a random sample of ${wanted} items.`);
  }

  function handleBarcodeScan(e: React.FormEvent) {
    e.preventDefault();
    const query = scannerInput.trim().toLowerCase();
    if (!query) return;

    const match = levels.find((l) =>
      [l.barcode, l.sku, l.name].some((v) => v.toLowerCase() === query),
    );
    if (match) {
      stepCount(match.itemId, 1);
      toast.success(`Scanned: ${match.name} (+1 counted)`);
      setScannerInput("");
    } else {
      toast.error(`No item matches barcode/SKU "${scannerInput}"`);
    }
  }

  function printCountSheet() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print count worksheet");
      return;
    }
    const dateStr = new Date().toLocaleDateString("en-NG", { dateStyle: "long" });
    const itemsToPrint = levels.filter((l) => selectedSet.has(l.itemId));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Count Worksheet - ${dateStr}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 4px 0; }
            p { font-size: 12px; color: #555; margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #333; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .box { width: 80px; height: 24px; border: 1px solid #999; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Physical Stock Count Worksheet</h1>
          <p>Auditor: ________________________ | Date: ${dateStr} | Total Products: ${itemsToPrint.length}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>System Qty</th>
                <th>Physical Count</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${itemsToPrint
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.sku || "—"}</td>
                  <td>${item.barcode || "—"}</td>
                  <td>${item.category || "—"}</td>
                  <td>${item.onHand} ${item.unitLabel || item.unit}</td>
                  <td><div class="box"></div></td>
                  <td>________________</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      `Applied ${result.matched} count${result.matched === 1 ? "" : "s"}${
        result.unmatched.length ? ` (${result.unmatched.length} skipped)` : ""
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
        `Successfully posted ${countedRows.length} count${countedRows.length === 1 ? "" : "s"}${
          varianceCount ? ` with ${varianceCount} variance${varianceCount === 1 ? "" : "s"}` : ""
        }.`,
      );
    } catch (error) {
      toast.error(error, "Could not post stock counts");
    } finally {
      setPosting(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="space-y-5">
      {/* KPI Discrepancy & Progress Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[11px] font-semibold uppercase text-pos-ink-faint">Products Selected</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-pos-ink tabular-nums">{selected.length}</span>
            <span className="text-xs text-pos-ink-muted">of {levels.length} catalogue items</span>
          </div>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[11px] font-semibold uppercase text-pos-ink-faint">Count Progress</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-pos-ink tabular-nums">{progress}%</span>
            <span className="text-xs text-pos-ink-muted">
              {countedRows.length} entered · {pendingCount} pending
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-pos-surface-muted">
            <div className="h-full rounded-full bg-pos-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 shadow-pos-sm transition ${
            varianceCount > 0 ? "border-pos-danger/30 bg-pos-danger/5" : "border-pos-border/80 bg-pos-surface"
          }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase ${
              varianceCount > 0 ? "text-pos-danger" : "text-pos-ink-faint"
            }`}
          >
            Discrepancies
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold tabular-nums ${
                varianceCount > 0 ? "text-pos-danger" : "text-pos-ink"
              }`}
            >
              {varianceCount}
            </span>
            <span className="text-xs text-pos-ink-muted">{matchedCount} exact matches</span>
          </div>
        </div>

        <div className="rounded-2xl border border-pos-border/80 bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[11px] font-semibold uppercase text-pos-ink-faint">Est. Value Variance</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold tabular-nums ${
                netCostImpactMinor < 0
                  ? "text-pos-danger"
                  : netCostImpactMinor > 0
                    ? "text-pos-success"
                    : "text-pos-ink"
              }`}
            >
              {naira(netCostImpactMinor, 0)}
            </span>
            <span className="text-xs text-pos-ink-muted">at cost valuation</span>
          </div>
        </div>
      </div>

      {/* Main Worksheet Container */}
      <section className="rounded-[24px] border border-pos-border/80 bg-pos-surface p-6 shadow-pos-md">
        {/* Header toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-pos-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-pos-ink">
                {mode === "initial" ? "Full Physical Count Worksheet" : "Random Stock Check Worksheet"}
              </h2>
              <span className="rounded-full bg-pos-primary/10 px-2 py-0.5 text-[10px] font-semibold text-pos-primary uppercase">
                Audit Active
              </span>
            </div>
            <p className="mt-0.5 text-xs text-pos-ink-muted">
              Count items and enter physical figures. Only ledger discrepancies will be adjusted upon committing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={printCountSheet}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink shadow-pos-sm hover:bg-pos-surface-muted"
            >
              <Printer size={13} className="text-pos-primary" />
              <span>Print Worksheet</span>
            </button>

            <button
              type="button"
              onClick={() => setPasteOpen(!pasteOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink shadow-pos-sm hover:bg-pos-surface-muted"
            >
              <ClipboardPaste size={13} className="text-pos-primary" />
              <span>Paste Spreadsheet Data</span>
            </button>

            <button
              type="button"
              onClick={startFullCount}
              className="inline-flex items-center gap-1.5 rounded-xl bg-pos-surface-muted px-3 py-2 text-xs font-semibold text-pos-ink hover:bg-pos-border/60"
            >
              <ClipboardList size={13} />
              <span>Select All Catalogue</span>
            </button>
          </div>
        </div>

        {/* Real-time Barcode Scanner Box */}
        <form onSubmit={handleBarcodeScan} className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Barcode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-primary" />
            <input
              type="text"
              placeholder="Barcode / SKU Quick Scanner — scan or type and press Enter to increment (+1)..."
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              className="w-full rounded-2xl border border-pos-border/80 bg-pos-surface-muted/60 py-2.5 pl-10 pr-4 text-xs font-mono text-pos-ink placeholder:font-sans placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!scannerInput.trim()}
            className="rounded-2xl bg-pos-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Count Item
          </button>
        </form>

        {/* Filters and search row */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
            <input
              type="text"
              placeholder="Filter by name, SKU or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-pos-border bg-pos-surface-muted/60 py-2 pl-9 pr-3 text-xs text-pos-ink placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
            />
          </div>

          <div className="min-w-[160px]">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-pos-border bg-pos-surface-muted/60 py-2 px-3 text-xs text-pos-ink focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Random sample generator */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={Math.max(1, filtered.length)}
              value={sampleSize}
              onChange={(e) => setSampleSize(e.target.value)}
              className="w-16 rounded-xl border border-pos-border bg-pos-surface-muted/60 py-2 px-2 text-center text-xs text-pos-ink focus:border-pos-primary focus:outline-none"
              title="Sample Size"
            />
            <button
              type="button"
              onClick={pickRandom}
              disabled={!filtered.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink shadow-pos-sm hover:bg-pos-surface-muted disabled:opacity-40"
            >
              <Dice5 size={13} className="text-pos-primary" />
              <span>Random Sample</span>
            </button>
          </div>
        </div>

        {/* Filter Status Pills */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-pos-border/60 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all" as const, label: `All Items (${filtered.length})` },
              { id: "pending" as const, label: `Uncounted (${pendingCount})` },
              { id: "variance" as const, label: `Discrepancies (${varianceCount})` },
              { id: "matched" as const, label: `Matched (${matchedCount})` },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterStatus(chip.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filterStatus === chip.id
                    ? "bg-pos-ink text-white"
                    : "bg-pos-surface-muted text-pos-ink-muted hover:bg-pos-border/60 hover:text-pos-ink"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-pos-ink-muted">
            <input
              type="checkbox"
              checked={allShownSelected}
              onChange={toggleAllShown}
              className="size-3.5 rounded border-pos-border text-pos-primary focus:ring-pos-primary"
            />
            <span>Select all shown ({filtered.length})</span>
          </label>
        </div>

        {/* Paste Counts Drawer */}
        {pasteOpen && (
          <div className="mt-4 rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pos-ink">
                Paste SKU/Barcode and Count Quantity (one per line)
              </span>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="text-pos-ink-faint hover:text-pos-ink"
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              placeholder={"SKU-001\t24\nSKU-002, 18\n8901234560003, 150"}
              className="mt-2 w-full rounded-xl border border-pos-border bg-pos-surface p-3 font-mono text-xs text-pos-ink focus:border-pos-primary focus:outline-none"
            />
            <div className="mt-2.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="rounded-xl px-3 py-1.5 text-xs text-pos-ink-muted hover:bg-pos-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPaste}
                disabled={!pasteText.trim()}
                className="rounded-xl bg-pos-primary px-4 py-1.5 text-xs font-semibold text-white shadow-pos-sm disabled:opacity-50"
              >
                Parse & Apply Counts
              </button>
            </div>
          </div>
        )}

        {/* Invalid count warning */}
        {invalidCountIds.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-pos-danger/10 px-4 py-2.5 text-xs font-medium text-pos-danger">
            <AlertCircle size={15} />
            <span>
              {invalidCountIds.length} invalid count input(s). Quantities must be whole non-negative integers.
            </span>
          </div>
        )}

        {/* Physical Count Table */}
        <div className="mt-4 max-h-[500px] overflow-auto rounded-2xl border border-pos-border/80">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-pos-surface-muted/95 border-b border-pos-border backdrop-blur-sm">
              <tr>
                <th className="w-10 px-3.5 py-3 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3.5 py-3 font-semibold text-pos-ink">Product</th>
                <th className="px-3.5 py-3 font-semibold text-pos-ink">SKU & Barcode</th>
                <th className="px-3.5 py-3 text-right font-semibold text-pos-ink">System Qty</th>
                <th className="w-56 px-3.5 py-3 text-center font-semibold text-pos-ink">Physical Count</th>
                <th className="px-3.5 py-3 text-right font-semibold text-pos-ink">Variance & Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/40 bg-pos-surface">
              {pageRows.map((row) => {
                const raw = counts[row.itemId] ?? "";
                const parsed = raw.trim() === "" ? null : Number(raw);
                const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 0);
                const variance = !invalid && parsed !== null ? parsed - row.onHand : null;
                const unitCost = row.onHand > 0 ? Math.round(row.valueMinor / row.onHand) : 0;
                const costImpact = variance !== null ? variance * unitCost : null;
                const isSelected = selectedSet.has(row.itemId);

                return (
                  <tr
                    key={row.itemId}
                    className={`transition ${isSelected ? "hover:bg-pos-surface-muted/30" : "bg-pos-surface-muted/20 opacity-60"}`}
                  >
                    <td className="px-3.5 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.itemId)}
                        aria-label={`Select ${row.name}`}
                        className="size-4 rounded border-pos-border text-pos-primary focus:ring-pos-primary"
                      />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <p className="font-semibold text-pos-ink">{row.name}</p>
                      <p className="text-[11px] text-pos-ink-muted">{row.category || "General"}</p>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-pos-ink-muted">
                      <div>{row.sku || <span className="text-pos-ink-faint">—</span>}</div>
                      <div className="text-[10px] text-pos-ink-faint">{row.barcode || ""}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-pos-ink tabular-nums">
                      {row.onHand} <span className="text-[11px] text-pos-ink-faint">{row.unitLabel || row.unit}</span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => stepCount(row.itemId, -1)}
                          disabled={!parsed || parsed <= 0}
                          className="grid size-7 place-items-center rounded-lg border border-pos-border bg-pos-surface text-pos-ink hover:bg-pos-surface-muted disabled:opacity-30"
                          title="Decrease 1"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={raw}
                          placeholder="—"
                          onChange={(e) => {
                            if (!isSelected) toggleRow(row.itemId);
                            setCounts((current) => ({
                              ...current,
                              [row.itemId]: e.target.value,
                            }));
                          }}
                          className={`w-20 rounded-xl border px-2 py-1.5 text-center font-bold text-xs tabular-nums text-pos-ink focus:outline-none ${
                            invalid
                              ? "border-pos-danger bg-pos-danger/5 text-pos-danger"
                              : parsed !== null
                                ? "border-pos-primary bg-pos-primary-soft/50"
                                : "border-pos-border bg-pos-surface-muted/40"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => stepCount(row.itemId, 1)}
                          className="grid size-7 place-items-center rounded-lg border border-pos-border bg-pos-surface text-pos-ink hover:bg-pos-surface-muted"
                          title="Increase 1"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => matchSystemOnHand(row.itemId, row.onHand)}
                          className="rounded-lg bg-pos-surface-muted px-2 py-1 text-[10px] font-semibold text-pos-ink-muted hover:text-pos-ink"
                          title="Match System Quantity"
                        >
                          Match
                        </button>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums">
                      {variance === null ? (
                        <span className="text-pos-ink-faint">—</span>
                      ) : (
                        <div>
                          <span
                            className={
                              variance > 0
                                ? "text-pos-success"
                                : variance < 0
                                  ? "text-pos-danger"
                                  : "text-pos-ink-faint"
                            }
                          >
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                          {costImpact !== null && costImpact !== 0 && (
                            <p className="text-[10px] font-normal text-pos-ink-faint">
                              {naira(costImpact, 0)}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-pos-ink-faint">
                    No products matched your search / status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Bulk actions bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-pos-border px-3 py-1.5 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-pos-ink-faint">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-pos-border px-3 py-1.5 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fillWithSystemQuantity}
              disabled={!selected.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted disabled:opacity-40"
            >
              <RefreshCw size={13} />
              <span>Fill System Qty</span>
            </button>

            <button
              type="button"
              onClick={clearCounts}
              disabled={!countedRows.length && !invalidCountIds.length}
              className="rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted disabled:opacity-40"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => void postCounts()}
              disabled={posting || !countedRows.length || invalidCountIds.length > 0}
              className="inline-flex items-center gap-2 rounded-xl bg-pos-primary px-5 py-2 text-xs font-semibold text-white shadow-pos-primary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
              <span>Commit {countedRows.length} Counts to Ledger</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------
 * History Page Component
 * ------------------------------------------------------------- */
function HistoryPage({
  movements,
  ready,
  refresh,
}: {
  movements: StockMovement[];
  ready: boolean;
  refresh: () => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

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
    <div className="space-y-5">
      <section className="rounded-[24px] border border-pos-border/80 bg-pos-surface p-6 shadow-pos-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pos-border/60 pb-4">
          <div>
            <h2 className="text-base font-bold text-pos-ink">Physical Count & Adjustment Audit Trail</h2>
            <p className="text-xs text-pos-ink-muted">
              Full historic log of stocktaking sessions, auditor staff, and net ledger corrections.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh().catch(() => undefined)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-1.5 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
            <input
              type="text"
              placeholder="Search reference, product, reason or staff..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-pos-border bg-pos-surface-muted/60 py-2 pl-9 pr-3 text-xs text-pos-ink placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
            />
          </div>

          <div className="min-w-[160px]">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-pos-border bg-pos-surface-muted/60 py-2 px-3 text-xs text-pos-ink focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
            >
              <option value="all">All Movements ({runs.length})</option>
              <option value="count">Physical Counts Only</option>
              <option value="adjustment">Adjustments Only</option>
            </select>
          </div>
        </div>

        {/* Runs Table */}
        <div className="mt-4 overflow-x-auto">
          {!ready ? (
            <ManagerSkeleton variant="table" />
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-xs text-pos-ink-faint">
              No audit sessions match this search filter.
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-pos-border text-[11px] font-semibold uppercase text-pos-ink-faint">
                <tr>
                  <th className="py-3 px-3">Session / Movement</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Auditor</th>
                  <th className="py-3 px-3 text-right">Items</th>
                  <th className="py-3 px-3 text-right">Net Variance</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/50">
                {runs.map((run) => {
                  const first = run.lines[0];
                  const { increase, decrease } = runTotals(run.lines);
                  const isCount = first?.type === "count";
                  return (
                    <tr key={run.id} className="transition hover:bg-pos-surface-muted/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              isCount ? "bg-pos-primary" : "bg-pos-success"
                            }`}
                          />
                          <span className="font-semibold text-pos-ink">
                            {first?.reason || (isCount ? "Stock Count Audit" : "Stock Adjustment")}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-pos-ink-faint truncate max-w-[200px]">
                          {run.id}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-pos-ink-muted whitespace-nowrap">
                        {new Date(run.at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3 text-pos-ink">{first?.staff || "System"}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-pos-ink-muted">
                        {run.lines.length} lines
                      </td>
                      <td className="py-3 px-3 text-right font-semibold tabular-nums">
                        {increase > 0 && <span className="text-pos-success">+{increase}</span>}
                        {decrease > 0 && (
                          <span className={`${increase > 0 ? "ml-1.5" : ""} text-pos-danger`}>
                            −{decrease}
                          </span>
                        )}
                        {increase === 0 && decrease === 0 && (
                          <span className="text-pos-ink-faint">0 matched</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRun(run)}
                          className="rounded-lg border border-pos-border px-3 py-1.5 text-xs font-semibold text-pos-ink hover:bg-pos-surface-muted"
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedRun && <SessionDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </div>
  );
}

/* -------------------------------------------------------------
 * Main Stock Taking Module
 * ------------------------------------------------------------- */
export function StockTakingModule({ mode }: { mode: Mode }) {
  const { levels, movements, live, ready, refresh } = useLiveInventory();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-pos-border/70 pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Operations · Inventory Control
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-pos-ink">Stock Taking & Audits</h1>
          <p className="mt-1 max-w-2xl text-xs text-pos-ink-muted">
            Conduct full or random physical inventory counts, detect stock discrepancies, and record traceable ledger adjustments in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-pos-border bg-pos-surface px-3 py-1.5 text-xs font-medium text-pos-ink-muted shadow-pos-sm">
            <span className="relative flex size-2">
              <span
                className={`absolute inline-flex size-full rounded-full bg-pos-success opacity-75 ${
                  live ? "animate-ping" : ""
                }`}
              />
              <span
                className={`relative inline-flex size-2 rounded-full ${
                  live ? "bg-pos-success" : "bg-pos-warning"
                }`}
              />
            </span>
            <span>{live ? "Live Inventory Active" : "Connecting..."}</span>
          </span>
        </div>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-pos-surface-muted p-1 shadow-inner">
        {LINKS.map((link) => {
          const active = link.mode === mode;
          const IconComp = link.icon;
          return (
            <Link
              key={link.mode}
              href={link.href}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-pos-surface text-pos-ink shadow-pos-sm"
                  : "text-pos-ink-muted hover:text-pos-ink"
              }`}
            >
              <IconComp size={15} className={active ? "text-pos-primary" : ""} />
              <span>{link.label}</span>
              {link.mode === "initial" && (
                <span className="rounded-full bg-pos-surface-muted px-1.5 py-0.5 text-[10px] text-pos-ink-faint">
                  {levels.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Mode Sub-views */}
      {mode === "overview" && (
        <Overview levels={levels} movements={movements} ready={ready} refresh={refresh} />
      )}
      {(mode === "initial" || mode === "random") && (
        <CountWorkspace
          key={mode}
          mode={mode}
          levels={levels}
          live={live}
          ready={ready}
          movements={movements}
          refresh={refresh}
        />
      )}
      {mode === "adjustments" && <InventoryAdjustment hideHeader={true} />}
      {mode === "history" && (
        <HistoryPage movements={movements} ready={ready} refresh={refresh} />
      )}
    </div>
  );
}
