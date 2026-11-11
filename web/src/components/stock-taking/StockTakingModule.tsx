"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Dice5,
  History,
  PackageCheck,
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

const LINKS: Array<{ mode: Mode; label: string; href: string }> = [
  { mode: "overview", label: "Overview", href: "/stock-taking" },
  { mode: "initial", label: "Initial stock take", href: "/stock-taking/initial" },
  { mode: "random", label: "Random stock take", href: "/stock-taking/random" },
  { mode: "adjustments", label: "Stock adjustments", href: "/stock-taking/adjustments" },
  { mode: "history", label: "Count history", href: "/stock-taking/history" },
];

function RunHistory({ movements }: { movements: StockMovement[] }) {
  const runs = useMemo(() => {
    const rows = movements.filter((move) => move.type === "count" || move.type === "adjustment");
    const groups = new Map<string, StockMovement[]>();
    for (const move of rows) {
      const key = move.runId || `${move.type}-${move.at.slice(0, 16)}-${move.staff || ""}`;
      groups.set(key, [...(groups.get(key) ?? []), move]);
    }
    return [...groups.entries()]
      .map(([id, lines]) => ({ id, lines, at: lines[0]?.at ?? "" }))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [movements]);

  if (!runs.length) {
    return <div className="rounded-2xl bg-pos-surface-muted/60 p-8 text-center text-sm text-pos-ink-muted">No stock counts or adjustments have been posted yet.</div>;
  }
  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const first = run.lines[0]!;
        const increase = run.lines.reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
        const decrease = run.lines.reduce((sum, line) => sum + Math.max(0, -line.quantity), 0);
        return (
          <article key={run.id} className="rounded-2xl border border-pos-border/60 bg-pos-surface p-4 shadow-pos-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-pos-ink">{first.reason || (first.type === "count" ? "Stock count" : "Stock adjustment")}</p>
                <p className="mt-1 text-xs text-pos-ink-muted">{new Date(run.at).toLocaleString("en-NG")} · {first.staff || "Staff not recorded"} · {run.lines.length} item{run.lines.length === 1 ? "" : "s"}</p>
                <p className="mt-1 font-mono text-[11px] text-pos-ink-faint">{run.id}</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold tabular-nums">
                {increase > 0 && <span className="rounded-full bg-pos-success-soft px-2.5 py-1 text-pos-success">+{increase}</span>}
                {decrease > 0 && <span className="rounded-full bg-pos-danger/10 px-2.5 py-1 text-pos-danger">−{decrease}</span>}
              </div>
            </div>
            <details className="mt-3 border-t border-pos-border/60 pt-3">
              <summary className="cursor-pointer text-xs font-medium text-pos-primary">View item details</summary>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {run.lines.map((line) => <li key={line.id} className="flex justify-between gap-3 rounded-lg bg-pos-surface-muted/50 px-3 py-2 text-xs"><span className="truncate text-pos-ink">{line.itemName}</span><span className="shrink-0 font-semibold tabular-nums text-pos-ink-muted">{line.quantity > 0 ? "+" : ""}{line.quantity}</span></li>)}
              </ul>
            </details>
          </article>
        );
      })}
    </div>
  );
}

function CountWorkspace({ mode, levels, live, ready, movements }: {
  mode: "initial" | "random";
  levels: StockLevel[];
  live: boolean;
  ready: boolean;
  movements: StockMovement[];
}) {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sampleSize, setSampleSize] = useState("20");
  const [selected, setSelected] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState(false);

  const categories = useMemo(() => [...new Set(levels.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [levels]);
  const random = mode === "random";
  const sampled = random ? selected : levels.map((row) => row.itemId);
  const shown = useMemo(() => levels.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [row.name, row.sku, row.barcode, row.category].some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (category === "all" || row.category === category) && (!random || selected.length === 0 || selected.includes(row.itemId));
  }), [levels, search, category, random, selected]);

  const countedRows = sampled.flatMap((itemId) => {
    const level = levels.find((row) => row.itemId === itemId);
    if (!level) return [];
    const value = counts[level.itemId];
    if (value === undefined || value.trim() === "") return [];
    const countedOnHand = Number(value);
    return Number.isInteger(countedOnHand) && countedOnHand >= 0 ? [{ level, countedOnHand, variance: countedOnHand - level.onHand }] : [];
  });
  const staged = countedRows.filter((row) => row.variance !== 0);

  function pickRandom() {
    const pool = levels.filter((level) => category === "all" || level.category === category);
    const wanted = Math.max(1, Math.min(pool.length, Math.floor(Number(sampleSize) || 1)));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    setSelected(shuffled.slice(0, wanted).map((row) => row.itemId));
    setCounts({});
  }

  async function postCounts() {
    if (!countedRows.length || (random && countedRows.length !== selected.length)) return;
    setPosting(true);
    try {
      await recordMovements({
        type: "count",
        reason: random ? "Random stock take" : "Initial stock take",
        staff: session?.name,
        lines: countedRows.map(({ level, countedOnHand }) => ({ itemId: level.itemId, quantity: 0, countedOnHand })),
      });
      setCounts({});
      if (random) setSelected([]);
      toast.success(`${countedRows.length} item count${countedRows.length === 1 ? "" : "s"} posted${staged.length ? ` with ${staged.length} variance${staged.length === 1 ? "" : "s"}` : " with no variances"}.`);
    } catch (error) {
      toast.error(error, "Could not post stock counts");
    } finally {
      setPosting(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;
  const currentCounted = movements.filter((row) => row.type === "count").length;
  const header = random ? "Random stock take" : "Initial stock take";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-pos-surface p-4 shadow-pos-sm"><p className="text-xs text-pos-ink-muted">Products in catalogue</p><p className="mt-1 text-2xl font-semibold text-pos-ink">{levels.length}</p></div>
        <div className="rounded-2xl bg-pos-surface p-4 shadow-pos-sm"><p className="text-xs text-pos-ink-muted">Count entries recorded</p><p className="mt-1 text-2xl font-semibold text-pos-ink">{currentCounted}</p></div>
        <div className="rounded-2xl bg-pos-surface p-4 shadow-pos-sm"><p className="text-xs text-pos-ink-muted">Live stock feed</p><p className={`mt-1 text-base font-semibold ${live ? "text-pos-success" : "text-pos-ink-muted"}`}>{live ? "Connected" : "Reconnecting"}</p></div>
      </div>
      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border px-5 py-4">
          <div><h2 className="font-semibold text-pos-ink">{header} worksheet</h2><p className="mt-1 text-xs text-pos-ink-muted">Enter a physical quantity. Only variances are posted to the stock ledger.</p></div>
          <button type="button" onClick={postCounts} disabled={posting || countedRows.length === 0 || (random && countedRows.length !== selected.length)} className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white shadow-pos-primary disabled:opacity-40"><ClipboardCheck size={16} />{posting ? "Posting…" : `Post ${countedRows.length} counts`}</button>
        </div>
        {random && <div className="flex flex-wrap items-end gap-3 border-b border-pos-border bg-pos-surface-muted/40 px-5 py-4">
          <label className="text-xs font-medium text-pos-ink-muted">Category<select value={category} onChange={(event) => { setCategory(event.target.value); setSelected([]); setCounts({}); }} className={`${fieldClass} mt-1 block min-w-48`}><option value="all">All categories</option>{categories.map((row) => <option key={row} value={row}>{row}</option>)}</select></label>
          <label className="text-xs font-medium text-pos-ink-muted">Number of items<input type="number" min={1} max={levels.length} value={sampleSize} onChange={(event) => setSampleSize(event.target.value)} className={`${fieldClass} mt-1 block w-32`} /></label>
          <button type="button" onClick={pickRandom} className="inline-flex items-center gap-2 rounded-full border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-semibold text-pos-ink"><Dice5 size={16} />Pick random items</button>
          <span className="text-xs text-pos-ink-faint">{selected.length} selected</span>
        </div>}
        <div className="flex flex-wrap gap-3 border-b border-pos-border px-5 py-4">
          <label className="relative min-w-56 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, SKU, barcode…" className={`${fieldClass} w-full pl-9`} /></label>
          {!random && <label className="text-xs font-medium text-pos-ink-muted">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className={`${fieldClass} ml-2 min-w-40`}><option value="all">All categories</option>{categories.map((row) => <option key={row} value={row}>{row}</option>)}</select></label>}
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-pos-surface-muted/50 text-[11px] uppercase tracking-wide text-pos-ink-faint"><tr>{random && <th className="w-12 px-4 py-3">Pick</th>}<th className="px-5 py-3">Product</th><th className="px-5 py-3 text-right">System quantity</th><th className="w-40 px-5 py-3">Physical count</th><th className="px-5 py-3 text-right">Variance</th></tr></thead><tbody className="divide-y divide-pos-border/50">{shown.map((row) => {
          const input = counts[row.itemId] ?? "";
          const n = input.trim() === "" ? null : Number(input);
          const variance = n != null && Number.isInteger(n) && n >= 0 ? n - row.onHand : null;
          return <tr key={row.itemId} className="hover:bg-pos-surface-muted/40">{random && <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(row.itemId)} aria-label={`Include ${row.name}`} onChange={(event) => { setSelected((current) => event.target.checked ? [...current, row.itemId] : current.filter((id) => id !== row.itemId)); setCounts((current) => { const next = { ...current }; if (!event.target.checked) delete next[row.itemId]; return next; }); }} /></td>}<td className="px-5 py-3"><p className="font-medium text-pos-ink">{row.name}</p><p className="text-xs text-pos-ink-faint">{row.sku || "No SKU"} · {row.category || "Uncategorised"}</p></td><td className="px-5 py-3 text-right tabular-nums text-pos-ink-muted">{row.onHand} {row.unitLabel || row.unit}</td><td className="px-5 py-3"><input type="number" min={0} step={1} value={input} placeholder="Count quantity" onChange={(event) => setCounts((current) => ({ ...current, [row.itemId]: event.target.value }))} className={`${fieldClass} w-full text-right tabular-nums`} /></td><td className={`px-5 py-3 text-right font-semibold tabular-nums ${variance == null || variance === 0 ? "text-pos-ink-faint" : variance > 0 ? "text-pos-success" : "text-pos-danger"}`}>{variance == null ? "—" : variance > 0 ? `+${variance}` : variance}</td></tr>;
        })}{shown.length === 0 && <tr><td colSpan={random ? 5 : 4} className="px-5 py-12 text-center text-sm text-pos-ink-muted">{random && selected.length === 0 ? "Pick a random sample or select products from the list." : "No products match this view."}</td></tr>}</tbody></table></div>
        <div className="border-t border-pos-border px-5 py-3 text-xs text-pos-ink-faint">Showing {shown.length} products · {countedRows.length} counts entered · {staged.length} variances</div>
      </section>
    </div>
  );
}

export function StockTakingModule({ mode }: { mode: Mode }) {
  const { levels, movements, live, ready } = useLiveInventory();
  const value = levels.reduce((sum, row) => sum + row.valueMinor, 0);
  const low = levels.filter((row) => row.onHand <= row.reorderPoint).length;
  const countRuns = new Set(movements.filter((row) => row.type === "count" && row.runId).map((row) => row.runId)).size;
  const title = LINKS.find((link) => link.mode === mode)?.label ?? "Stock taking";

  return <div className="pb-8">
    <header className="mb-5 rounded-[24px] bg-gradient-to-br from-pos-primary to-violet-700 p-6 text-white shadow-pos-primary sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-white/70">Inventory operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{mode === "overview" ? "Stock taking" : title}</h1><p className="mt-2 max-w-2xl text-sm text-white/80">Plan and record physical counts, investigate variances, and keep every stock change traceable.</p></div><div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-medium"><span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-300" : "bg-amber-300"}`} />{live ? "Live inventory" : "Connecting"}</div></div>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Stock taking pages">{LINKS.map((link) => <Link key={link.mode} href={link.href} className={`rounded-full px-4 py-2 text-sm font-medium transition ${link.mode === mode ? "bg-white text-pos-primary" : "bg-white/10 text-white hover:bg-white/20"}`}>{link.label}</Link>)}</nav>
    </header>

    {mode === "overview" && <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Products tracked", value: ready ? levels.length.toLocaleString() : "—", icon: PackageCheck }, { label: "Inventory value", value: ready ? naira(value, 0) : "—", icon: SlidersHorizontal }, { label: "Below reorder level", value: ready ? low.toLocaleString() : "—", icon: ArrowDownRight }, { label: "Count sessions", value: ready ? countRuns.toLocaleString() : "—", icon: History }].map(({ label, value: stat, icon: Icon }) => <div key={label} className="rounded-2xl bg-pos-surface p-4 shadow-pos-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary"><Icon size={18} /></span><p className="mt-4 text-xs text-pos-ink-muted">{label}</p><p className="mt-1 text-2xl font-semibold text-pos-ink">{stat}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">{[
        { href: "/stock-taking/initial", title: "Initial stock take", copy: "Record opening quantities for the full catalogue and establish your baseline.", icon: ClipboardList, action: "Start initial count" },
        { href: "/stock-taking/random", title: "Random stock take", copy: "Select a random sample or a focused category for spot checks.", icon: Dice5, action: "Start random count" },
        { href: "/stock-taking/adjustments", title: "Stock adjustments", copy: "Log damage, expiry, loss, giveaways, and other justified changes.", icon: SlidersHorizontal, action: "Open adjustments" },
      ].map(({ href, title: cardTitle, copy, icon: Icon, action }) => <Link key={href} href={href} className="group rounded-[22px] bg-pos-surface p-5 shadow-pos-md transition hover:-translate-y-0.5 hover:shadow-pos-lg"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-pos-primary-soft text-pos-primary"><Icon size={21} /></span><h2 className="mt-4 font-semibold text-pos-ink">{cardTitle}</h2><p className="mt-1 min-h-10 text-sm text-pos-ink-muted">{copy}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-pos-primary">{action}<ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link>)}
      </div>
      <section className="mt-5 rounded-[22px] bg-pos-surface p-5 shadow-pos-md"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-pos-ink">Recent count activity</h2><p className="mt-1 text-xs text-pos-ink-muted">Latest physical counts and manual adjustments.</p></div><Link href="/stock-taking/history" className="text-sm font-semibold text-pos-primary">View history</Link></div><RunHistory movements={movements.slice(0, 200)} /></section>
    </>}

    {mode === "initial" || mode === "random" ? <CountWorkspace mode={mode} levels={levels} live={live} ready={ready} movements={movements} /> : null}
    {mode === "adjustments" ? <InventoryAdjustment /> : null}
    {mode === "history" && <section className="rounded-[22px] bg-pos-surface p-5 shadow-pos-md"><div className="mb-4 flex items-center gap-2"><History size={19} className="text-pos-primary" /><div><h2 className="font-semibold text-pos-ink">Count and adjustment history</h2><p className="mt-1 text-xs text-pos-ink-muted">Posted stock movement batches, newest first.</p></div></div>{!ready ? <ManagerSkeleton variant="table" /> : <RunHistory movements={movements} />}</section>}
  </div>;
}
