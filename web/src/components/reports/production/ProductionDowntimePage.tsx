"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDashed, Hammer, Hourglass } from "lucide-react";
import { getProductionBook, type ProductionBook } from "@/lib/hq-production";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const HOURS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setHours(d.getHours() - i, 0, 0, 0);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
  return { key, label: d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric" }) };
});

export function ProductionDowntimePage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [bucket, setBucket] = useState(0);

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch(() => setBook(null));
  }, []);

  const rows = useMemo(() => {
    if (!book) return null;
    const start = new Date(HOURS[bucket].key);
    const end = new Date(start.getTime() + 60000 * 60);
    const open = book.batches.filter((row) => row.status === "in-progress");
    const planned = book.batches.filter(
      (row) => new Date(row.startedAt) >= start && new Date(row.startedAt) < end,
    );
    const slides = book.batches.filter((row) => {
      const t = new Date(row.startedAt);
      return t >= end && row.plannedUnits > 0;
    });
    const paused = open.filter((row) => {
      const t = new Date(row.startedAt);
      return t < start;
    });
    return { open, planned, slides, paused };
  }, [book, bucket]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const stat = (icon: React.ReactNode, label: string, value: string, sub: string) => (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">{label}</p>
        <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className="mt-0.5 truncate text-xs text-white/60">{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Production · Downtime</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Downtime</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Where the line goes quiet — open work that has overrun, sessions still queued, and the backlog pushing
            starts forward.
          </p>
          <div className="mt-8 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">
              {HOURS.map((h, i) => (
                <button
                  key={h.key}
                  onClick={() => setBucket(i)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${bucket === i ? "bg-white text-pos-primary" : "bg-white/15 text-white hover:bg-white/25"}`}
                >
                  {h.label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {stat(<Hourglass size={20} />, "Overrun", String(rows.paused.length), "open batches that started before the window")}
              {stat(<CircleDashed size={20} />, "New starts", String(rows.planned.length), "scheduled in the selected window")}
              {stat(<Hammer size={20} />, "At risk", String(rows.slides.length), "batches whose start has yet to arrive")}
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Open work & backlog</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Everything not yet finished as of {HOURS[bucket].label}.</p>
        </header>
        {rows.open.length === 0 ? (
          <div className="grid h-[140px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No open batches at this time.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batch</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Started</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Planned</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Produced</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.open.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{row.number}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.productName}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{new Date(row.startedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.plannedUnits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.producedUnits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[13px] text-pos-ink-muted">{row.line ?? "—"}</td>
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