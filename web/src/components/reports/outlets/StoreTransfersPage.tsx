"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, Boxes, UserRound } from "lucide-react";
import { listMovements, type StockMovement } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StoreTransfersPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [movements, setMovements] = useState<StockMovement[] | null>(null);

  useEffect(() => {
    listMovements()
      .then(setMovements)
      .catch(() => setMovements([]));
  }, []);

  const rows = useMemo(() => {
    if (!movements) return null;
    const transfers = movements
      .filter((move) => move.type === "transfer")
      .map((move) => ({
        ...move,
        at: new Date(move.at).toLocaleString(),
      }))
      .sort((a, b) => b.at.localeCompare(a.at));
    const byOrigin = new Map<string, number>();
    const byTarget = new Map<string, number>();
    for (const move of transfers) {
      if (move.from) byOrigin.set(move.from, (byOrigin.get(move.from) ?? 0) + move.quantity);
      if (move.to) byTarget.set(move.to, (byTarget.get(move.to) ?? 0) + move.quantity);
    }
    return {
      transfers: transfers.slice(0, 200),
      paired: Math.min(transfers.length, 200),
      total: transfers.reduce((sum, move) => sum + move.quantity, 0),
      byOrigin,
      byTarget,
    };
  }, [movements]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Transfers</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Store transfers</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every stock movement between outlets — the unit, the direction, who did it, and why.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ArrowLeftRight size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Transfers</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.transfers.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">most recent {rows.paired} shown</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Units transferred</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.total.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across all movements</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UserRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Senders on record</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {new Set(rows.transfers.map((move) => move.staff ?? move.from ?? "—")).size}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">staff or origin names</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Transfer ledger</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Sorted newest first; export needs backend support if you want more than the latest 200 rows.
          </p>
        </header>
        {rows.transfers.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No transfers yet — move stock between outlets on the inventory screens.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">When</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Item</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Route</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Qty</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.transfers.map((move) => (
                    <tr key={move.id} className="hover:bg-pos-surface-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{move.at}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{move.itemName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-pos-ink">
                          <span className="rounded-md bg-pos-surface-muted px-1.5 py-0.5 text-[12px]">{move.from ?? "?"}</span>
                          <ArrowRight size={14} className="text-pos-ink-faint" />
                          <span className="rounded-md bg-pos-surface-muted px-1.5 py-0.5 text-[12px]">{move.to ?? "?"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums" style={{ color: colors.primary }}>
                        {move.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-pos-ink-muted">{move.reason || move.staff || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}