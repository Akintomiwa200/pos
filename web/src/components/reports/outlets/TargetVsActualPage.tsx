"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, Store, Target, Trophy } from "lucide-react";
import { listStores, type HqStore } from "@/lib/hq-setup";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { listStoreTargets, type StoreTarget } from "@/lib/hq-ledger";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

type LocalTargets = { period: string; perStore: Record<string, number> };

function readLocalTargets(): LocalTargets | null {
  try {
    const raw = localStorage.getItem("pos.reports.storeTargets");
    return raw ? (JSON.parse(raw) as LocalTargets) : null;
  } catch {
    return null;
  }
}

function serverTargetsToPerStore(targets: StoreTarget[]): LocalTargets {
  const latest = targets.reduce((best, row) => (!best || row.period > best.period ? row : best), null as StoreTarget | null);
  const period = latest?.period ?? "";
  const perStore: Record<string, number> = {};
  for (const row of targets.filter((row) => row.period === period)) {
    perStore[row.storeId] = row.targetMinor;
  }
  return { period, perStore };
}

export function TargetVsActualPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [stores, setStores] = useState<HqStore[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [targets, setTargets] = useState<LocalTargets | null>(null);

  useEffect(() => {
    Promise.all([listStores().catch(() => [] as HqStore[]), listSales().catch(() => [] as HqSale[]), listStoreTargets()])
      .then(([s, r, t]) => {
        setStores(s);
        setSales(r);
        setTargets(Array.isArray(t) && t.length ? serverTargetsToPerStore(t) : readLocalTargets());
      })
      .catch(() => {
        setStores([]);
        setSales([]);
        setTargets(readLocalTargets());
      });
  }, []);

  const rows = useMemo(() => {
    if (!stores || !sales) return null;
    const byKey = new Map<string, number>();
    for (const sale of sales) {
      const key = sale.storeId ?? (sale.storeName || "Unassigned").trim();
      byKey.set(key, (byKey.get(key) ?? 0) + sale.totalMinor);
    }
    const keys = [...byKey.keys()];
    const lines = stores.map((store) => {
      const actual = byKey.get(store.id) ?? byKey.get(store.name) ?? 0;
      const targetMinor = targets?.perStore?.[store.id] ?? targets?.perStore?.[store.name] ?? 0;
      const pct = targetMinor > 0 ? Math.round((actual / targetMinor) * 1000) / 10 : null;
      return { store, actual, targetMinor, pct, met: pct !== null && pct >= 100 };
    });
    if (keys.length && lines.every((line) => line.actual === 0)) {
      for (const key of keys) {
        if (!lines.some((line) => line.store.id === key || line.store.name === key)) {
          lines.push({ store: { id: key, name: key, kind: "retail", address: "", active: true }, actual: byKey.get(key) ?? 0, targetMinor: targets?.perStore?.[key] ?? 0, pct: null, met: false });
        }
      }
    }
    lines.sort((a, b) => b.actual - a.actual);
    const totalTarget = lines.reduce((sum, row) => sum + row.targetMinor, 0);
    const totalActual = lines.reduce((sum, row) => sum + row.actual, 0);
    return { lines, totalTarget, totalActual, metCount: lines.filter((row) => row.met).length };
  }, [stores, sales, targets]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Target vs actual</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Target vs actual</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Store targets set on the Outlets desk (shared across devices, with older per-browser targets honoured as a
            fallback) checked against what the network has actually sold.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Target size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Target</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalTarget)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{targets?.period ?? "no period set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Crosshair size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Actual</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalActual)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  {rows.totalTarget > 0 ? `${Math.round((rows.totalActual / rows.totalTarget) * 100)}% of target` : "no target"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Trophy size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stores on target</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.metCount}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">of {rows.lines.filter((row) => row.targetMinor > 0).length} targeted</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Actual vs target</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Targets are set on the Outlets desk per period; unsaved stores show actuals with no bar.
          </p>
        </header>
        {rows.lines.every((row) => row.targetMinor === 0 && row.actual === 0) ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Nothing to compare yet — tag receipts to stores, then set targets per store.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.lines.map((row) => {
              const width = rows.totalActual > 0 ? Math.max(1, Math.round((row.actual / rows.totalActual) * 100)) : 0;
              return (
                <div key={row.store.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-pos-ink">{row.store.name}</span>
                    <span className="text-[12px] tabular-nums text-pos-ink-muted">
                      <span className="font-semibold text-pos-ink">{naira(row.actual)}</span>
                      {row.targetMinor > 0 && <span> / {naira(row.targetMinor)}</span>}
                      {row.pct !== null && (
                        <span className={`ml-1.5 font-semibold ${row.met ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {row.pct}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-6 overflow-hidden rounded-lg bg-pos-surface-muted">
                    <div
                      className="flex h-full items-center rounded-lg px-2 text-[11px] font-bold text-white"
                      style={{
                        width: `${Math.max(2, Math.min(100, ...(row.targetMinor > 0 ? [Math.round((row.actual / row.targetMinor) * 100)] : [width])))}%`,
                        background: row.targetMinor > 0 && row.met ? "#10b981" : colors.primary,
                      }}
                    >
                      {row.actual > 0 ? naira(row.actual) : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}