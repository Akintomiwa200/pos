"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Hourglass, Timer } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../../Skeleton";

function daysUntil(expiresAt: string) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

export function StockExpiryPage() {
  const [catalog, setCatalog] = useState<HqCatalogItem[] | null>(null);

  useEffect(() => {
    listCatalog()
      .then(setCatalog)
      .catch((err) => {
        toast.error(err, "Could not load catalog");
        setCatalog([]);
      });
  }, []);

  const dated = useMemo(
    () =>
      (catalog ?? [])
        .filter((item) => Boolean(item.expiresAt))
        .sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? "")),
    [catalog],
  );

  if (!catalog) return <ManagerSkeleton variant="table" />;

  if (dated.length === 0) {
    return (
      <div className="pb-8">
        <header className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Report · Stock
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Expiry</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Items with expiry dates, soonest first. Red already expired.
          </p>
        </header>
        <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
          <CalendarX2 size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-faint">
            No items carry expiry dates — set them on items to track batches.
          </p>
        </div>
      </div>
    );
  }

  const expired = dated.filter((item) => daysUntil(item.expiresAt!) < 0);
  const soon = dated.filter((item) => {
    const days = daysUntil(item.expiresAt!);
    return days >= 0 && days <= 30;
  });

  const maxDays = Math.max(1, ...dated.map((item) => daysUntil(item.expiresAt!)));

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Stock
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Expiry runway</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Batches that must move first — soonest expiry at the top.
        </p>
      </header>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="flex items-center gap-4 rounded-[20px] bg-rose-50 p-5 dark:bg-rose-950/30">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-pos-danger shadow-pos-sm">
            <CalendarX2 size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Expired batches</p>
            <p className="text-2xl font-bold tabular-nums text-rose-900 dark:text-rose-200">{expired.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[20px] bg-amber-50 p-5 dark:bg-amber-950/30">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-pos-warning shadow-pos-sm">
            <Hourglass size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Expiring within 30 days</p>
            <p className="text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-200">{soon.length}</p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 760 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Item</th>
                <th className="px-5 py-3.5">Batch</th>
                <th className="px-5 py-3.5">Expires</th>
                <th className="px-5 py-3.5">On hand</th>
                <th className="px-5 py-3.5">Days left</th>
                <th className="px-5 py-3.5 text-right">Sell price</th>
                <th className="px-5 py-3.5">Runway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {dated.map((item) => {
                const days = daysUntil(item.expiresAt!);
                const tone = days < 0 ? "danger" : days <= 30 ? "warning" : "ok";
                const width = days <= 0 ? 100 : Math.max(4, Math.round((days / maxDays) * 100));
                const barClass =
                  tone === "danger"
                    ? "bg-pos-danger"
                    : tone === "warning"
                      ? "bg-pos-warning"
                      : "bg-pos-success";
                return (
                  <tr key={item.id} className="hover:bg-pos-surface-muted/40">
                    <td className="px-5 py-3.5 font-medium text-pos-ink">{item.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-pos-ink-muted">{item.batchNumber || "—"}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap tabular-nums">
                      <span className={tone === "danger" ? "font-semibold text-pos-danger" : "text-pos-ink"}>
                        {item.expiresAt!.slice(0, 10)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-pos-ink-muted">
                      {formatStock(item.onHand, item.unit, item.packSize ?? 1, item.unitLabel)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          tone === "danger"
                            ? "bg-rose-50 text-pos-danger dark:bg-rose-950/40 dark:text-rose-300"
                            : tone === "warning"
                              ? "bg-amber-50 text-pos-warning dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-pos-success-soft text-pos-success"
                        }`}
                      >
                        <Timer size={12} />
                        {days < 0 ? `Expired ${-days}d ago` : `${days}d left`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(item.priceMinor)}</td>
                    <td className="px-5 py-3.5">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-pos-surface-muted">
                        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {expired.length > 0 ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          <strong>{expired.length}</strong> batche{expired.length === 1 ? " is" : "s are"} already expired —
          write these off or return them to the supplier to keep the books clean.
        </p>
      ) : null}
    </div>
  );
}