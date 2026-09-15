"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, MousePointerClick, RefreshCw, Store } from "lucide-react";
import { listStorefronts, type HqStorefront } from "@/lib/hq-setup";
import { listStores, type HqStore } from "@/lib/hq-setup";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StorefrontsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [storefronts, setStorefronts] = useState<HqStorefront[] | null>(null);
  const [stores, setStores] = useState<HqStore[]>([]);

  useEffect(() => {
    Promise.all([listStorefronts().catch(() => [] as HqStorefront[]), listStores().catch(() => [] as HqStore[])])
      .then(([sf, s]) => {
        setStorefronts(sf);
        setStores(s);
      })
      .catch(() => setStorefronts([]));
  }, []);

  const rows = useMemo(() => {
    if (!storefronts) return null;
    const enabled = storefronts.filter((row) => row.enabled);
    const withSync = enabled.filter((row) => row.syncPrices && row.syncStock);
    const byStore = new Map<string, { count: number; enabledCount: number }>();
    for (const row of storefronts) {
      const entry = byStore.get(row.storeId) ?? { count: 0, enabledCount: 0 };
      entry.count += 1;
      if (row.enabled) entry.enabledCount += 1;
      byStore.set(row.storeId, entry);
    }
    const storeNames = new Map(stores.map((store) => [store.id, store.name]));
    return { storefronts, enabled: enabled.length, withSync, byStore, storeNames };
  }, [storefronts, stores]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Storefronts</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Storefronts</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The online counters attached to your stores — what is live, what syncs prices and stock, and the hours
            customers can reach them.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Globe2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Storefronts</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.storefronts.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.enabled} live right now</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><RefreshCw size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Fully synced</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.withSync.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">prices and stock both on</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Stores covered</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.byStore.size}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">linked to at least one front</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Storefront directory</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Configuration surfaced as-is — no order volume is tracked at storefront level in this data set.</p>
        </header>
        {rows.storefronts.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No storefronts configured yet — create one in Setup to start selling to customers online.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.storefronts.map((row) => (
              <div key={row.id} className="rounded-2xl border border-pos-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-pos-ink">{row.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-pos-ink-muted">
                      <Store size={11} className="mr-1 inline -translate-y-px" />
                      {rows.storeNames.get(row.storeId) ?? row.storeId}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.enabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-pos-surface-muted text-pos-ink-faint"}`}
                  >
                    {row.enabled ? "Live" : "Paused"}
                  </span>
                </div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-pos-primary hover:underline"
                >
                  <MousePointerClick size={13} />
                  {row.url || "no url set"}
                </a>
                <div className="mt-3 flex items-center gap-3 text-xs text-pos-ink-muted">
                  <span className="tabular-nums">{row.hours || "Open 24h"}</span>
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw size={11} className={row.syncPrices ? "text-emerald-500" : "text-pos-ink-faint"} />
                    prices
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw size={11} className={row.syncStock ? "text-emerald-500" : "text-pos-ink-faint"} />
                    stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}