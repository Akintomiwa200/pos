import { Activity, CalendarDays, Clock3, Database } from "lucide-react";
import type { JournalEntry } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { SOURCE_ORDER, SOURCE_STYLE, entryTotals, prettyDayKey, timeOf } from "./journal-core";

function ByDayCard({ entries }: { entries: JournalEntry[] }) {
  const byDay = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const key = entry.at.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }
  const days = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);

  return (
    <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
      <h3 className="flex items-center gap-2 text-sm font-bold text-pos-ink">
        <CalendarDays size={16} className="text-pos-primary" /> Posting activity by day
      </h3>
      <ul className="mt-4 space-y-2.5">
        {days.map(([key, dayEntries]) => {
          let debit = 0;
          let credit = 0;
          let manualCount = 0;
          for (const entry of dayEntries) {
            const totals = entryTotals(entry);
            debit += totals.debitMinor;
            credit += totals.creditMinor;
            if (entry.source === "manual") manualCount += 1;
          }
          return (
            <li key={key} className="flex items-baseline gap-3 text-sm">
              <span className="w-36 shrink-0 font-medium text-pos-ink">{prettyDayKey(key)}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-full bg-pos-border/40" title={`Dr ${debit} / Cr ${credit}`}>
                <div
                  className="h-full rounded-full bg-pos-primary/70"
                  style={{ width: `${Math.min(100, widthPct(debit / (debit + credit || 1)))}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-pos-ink-faint">
                {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-pos-ink-faint">Bar width = share of debit turnover that day.</p>
    </div>
  );
}

function widthPct(ratio: number) {
  return Math.round(Math.max(2, ratio * 100));
}

function BySourceCard({ entries }: { entries: JournalEntry[] }) {
  const counts: Record<string, number> = {};
  const amounts: Record<string, number> = {};
  for (const entry of entries) {
    counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    amounts[entry.source] = (amounts[entry.source] ?? 0) + entryTotals(entry).debitMinor;
  }
  const totalsDr = entries.reduce((sum, entry) => sum + entryTotals(entry).debitMinor, 0);

  return (
    <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
      <h3 className="flex items-center gap-2 text-sm font-bold text-pos-ink">
        <Activity size={16} className="text-pos-primary" /> By source
      </h3>
      <ul className="mt-4 space-y-3">
        {SOURCE_ORDER.map((source) => {
          const style = SOURCE_STYLE[source];
          const Icon = style.icon;
          const count = counts[source] ?? 0;
          const amount = amounts[source] ?? 0;
          if (count === 0) return null;
          const share = totalsDr ? (amount / totalsDr) * 100 : 0;
          return (
            <li key={source} className="flex items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${style.soft}`}>
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-pos-ink">{style.label}</span>
                  <span className="text-xs tabular-nums text-pos-ink-faint">{count} entries</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pos-border/40">
                  <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${share}%` }} />
                </div>
              </div>
              <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-pos-ink">{naira(amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ActivityView({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="grid place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md">
        No activity to chart yet.
      </div>
    );
  }
  const lastAt = entries[0]?.at;
  return (
    <div>
      <p className="mb-4 flex flex-wrap items-center gap-3 text-xs text-pos-ink-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface px-3 py-1.5 shadow-pos-sm">
          <Clock3 size={13} /> Latest posting{" "}
          {lastAt ? (
            <span className="font-medium text-pos-ink">
              {prettyDayKey(lastAt.slice(0, 10))} at {timeOf(lastAt)}
            </span>
          ) : (
            "—"
          )}
        </span>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ByDayCard entries={entries} />
        <BySourceCard entries={entries} />
      </div>
      <p className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-pos-ink-faint">
        <Database size={12} /> Derived live from the accounting books.
      </p>
    </div>
  );
}
