import { CheckCircle2, ChevronDown } from "lucide-react";
import type { JournalEntry } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { SOURCE_STYLE, entryTotals, prettyDayKey, timeOf } from "./journal-core";

function PostingCard({ entry }: { entry: JournalEntry }) {
  const source = SOURCE_STYLE[entry.source];
  const SourceIcon = source.icon;
  const totals = entryTotals(entry);
  const balanced = totals.balanced;

  return (
    <article className="rounded-[18px] border border-pos-border/70 bg-pos-surface p-4 shadow-pos-sm transition hover:border-pos-primary/40">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${source.soft}`}>
          <SourceIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pos-ink">
            {entry.memo}
            <span className="ml-2 font-mono text-xs font-normal text-pos-ink-faint">{entry.ref}</span>
          </p>
          <p className="text-xs text-pos-ink-muted">
            {prettyDayKey(entry.at.slice(0, 10))} at {timeOf(entry.at)} • {entry.lines.length} line(s)
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${source.chip}`}>
          {source.label}
        </span>
        {balanced && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pos-success-soft px-2.5 py-1 text-[11px] font-bold text-pos-success">
            <CheckCircle2 size={12} /> Balanced
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-pos-border/60 pt-3 font-mono text-[13px] tabular-nums">
        {entry.lines.map((line, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-pos-ink-faint">{line.accountCode}</span>
            <span className={`min-w-0 flex-1 truncate ${line.debitMinor > 0 ? "text-pos-ink" : "text-pos-ink-muted"}`}>
              {line.debitMinor > 0 ? line.accountName : `To ${line.accountName}`}
            </span>
            {line.debitMinor > 0 ? (
              <span className="w-32 shrink-0 text-right text-pos-ink">{naira(line.debitMinor)}</span>
            ) : (
              <span className="w-32 shrink-0 text-right text-pos-ink-faint">—</span>
            )}
            {line.creditMinor > 0 ? (
              <span className="w-32 shrink-0 text-right font-medium text-pos-success">{naira(line.creditMinor)}</span>
            ) : (
              <span className="w-32 shrink-0 text-right text-pos-ink-faint">—</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-pos-border/60 pt-2.5 text-xs">
        <span className={`font-bold uppercase tracking-wide ${balanced ? "text-pos-success" : "text-pos-danger"}`}>
          {balanced ? "Dr = Cr" : "Unbalanced"}
        </span>
        <span className="text-pos-ink-faint">
          Dr {naira(totals.debitMinor)} : Cr {naira(totals.creditMinor)}
        </span>
      </div>
    </article>
  );
}

export function PostingsView({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="grid place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md">
        No journal postings match this view yet.
      </div>
    );
  }
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {entries.map((entry) => (
        <PostingCard key={entry.id} entry={entry} />
      ))}
      <div className="flex items-center justify-center gap-2 rounded-[18px] border border-dashed border-pos-border py-4 text-xs text-pos-ink-faint xl:col-span-2">
        <ChevronDown size={14} /> Postings update in real time as sales, purchases, expenses, and manual entries post.
      </div>
    </div>
  );
}
