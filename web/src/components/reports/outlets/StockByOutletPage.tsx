"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Boxes, Store, Warehouse } from "lucide-react";
import { listMovements, naira, type StockMovement } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StockByOutletPage() {
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
    const locations = new Map<string, { received: number; sent: number; adjustments: number }>();
    for (const move of movements) {
      if (move.type === "transfer") {
        if (move.to) {
          const to = locations.get(move.to) ?? { received: 0, sent: 0, adjustments: 0 };
          to.received += move.quantity;
          locations.set(move.to, to);
        }
        if (move.from) {
          const from = locations.get(move.from) ?? { received: 0, sent: 0, adjustments: 0 };
          from.sent += move.quantity;
          locations.set(move.from, from);
        }
      } else {
        const where = move.to ?? move.from ?? "Unassigned";
        const row = locations.get(where) ?? { received: 0, sent: 0, adjustments: 0 };
        row.adjustments += move.quantity;
        locations.set(where, row);
      }
    }
    const lines = [...locations.entries()]
      .map(([location, row]) => ({ location, ...row, netUnits: row.received - row.sent + row.adjustments }))
      .sort((a, b) => b.netUnits - a.netUnits);
    const totals = lines.reduce(
      (sum, row) => ({ received: sum.received + row.received, sent: sum.sent + row.sent, adjustments: sum.adjustments + row.adjustments }),
      { received: 0, sent: 0, adjustments: 0 },
    );
    return { lines, totals };
  }, [movements]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const maxNet = Math.max(...rows.lines.map((row) => Math.abs(row.netUnits)), 1);

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Stock by outlet</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Stock by outlet</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The movement ledger per location — units received, sent on, adjusted, and what each outlet is net holding by
            its stock activity.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Locations active</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">in the stock ledger</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ArrowLeftRight size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Units moved</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {(rows.totals.received + rows.totals.sent).toLocaleString()}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">transferred in and out</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Warehouse size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Net holding</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(0)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">movement-derived, not valuations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Location balances</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Received − sent + adjustments gives a net; bars align with the strongest net holding.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No stock movements recorded yet — transfers and counts between outlets will appear here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Location</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Received</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sent out</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Adjusted</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Net units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.location}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.location}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.received.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">-{row.sent.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {row.adjustments ? `${row.adjustments > 0 ? "+" : ""}${row.adjustments.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-16 overflow-hidden rounded-full bg-pos-border">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${(Math.abs(row.netUnits) / maxNet) * 100}%`,
                                background: row.netUnits >= 0 ? "#22c55e" : "#f59e0b",
                                marginLeft: row.netUnits < 0 ? "auto" : undefined,
                              }}
                            />
                          </span>
                          <span className="w-16 text-right text-[13px] font-semibold tabular-nums" style={{ color: colors.primary }}>
                            {row.netUnits > 0 ? "+" : ""}{row.netUnits.toLocaleString()}
                          </span>
                        </span>
                      </td>
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