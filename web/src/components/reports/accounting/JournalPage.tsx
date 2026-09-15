"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileSpreadsheet, PencilLine, Receipt, ShoppingCart } from "lucide-react";
import { toast } from "@/lib/toast";
import { loadAccountingBooks, type AccountingBooks, type JournalEntry } from "@/lib/hq-accounting";
import { naira, prettyDay } from "@/lib/hq-ops";
import { listJournalEntries, type LedgerJournalEntry } from "@/lib/hq-ledger";
import { ManagerSkeleton } from "../../Skeleton";

const SOURCE_STYLE: Record<JournalEntry["source"], { label: string; icon: typeof Receipt; class: string }> = {
  sale: {
    label: "Sale",
    icon: Receipt,
    class: "bg-pos-success-soft text-pos-success",
  },
  purchase: {
    label: "Purchase",
    icon: ShoppingCart,
    class: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  expense: {
    label: "Expense",
    icon: FileSpreadsheet,
    class: "bg-amber-50 text-pos-warning dark:bg-amber-950/40",
  },
  opening: {
    label: "Opening",
    icon: BookOpen,
    class: "bg-pos-primary-soft text-pos-primary",
  },
  manual: {
    label: "Manual",
    icon: PencilLine,
    class: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  },
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const source = SOURCE_STYLE[entry.source];
  const Icon = source.icon;
  const debit = entry.lines.reduce((sum, line) => sum + line.debitMinor, 0);
  const credit = entry.lines.reduce((sum, line) => sum + line.creditMinor, 0);
  const balanced = debit === credit;

  return (
    <article className="rounded-[18px] border border-pos-border/70 bg-pos-surface p-4 shadow-pos-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${source.class}`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-pos-ink">{entry.memo}</p>
          <p className="truncate text-xs text-pos-ink-faint">
            <span className="font-mono">{entry.ref}</span> · {prettyDay(entry.at.slice(0, 10))} · {timeOf(entry.at)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${source.class}`}>
          {source.label}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
            balanced ? "bg-pos-surface-muted text-pos-ink-muted" : "bg-rose-50 text-pos-danger dark:bg-rose-950/40"
          }`}
        >
          {naira(debit)}
        </span>
      </div>

      <ul className="mt-3 space-y-1 border-t border-pos-border/60 pt-3">
        {entry.lines.map((line, index) => (
          <li key={index} className="flex items-center justify-between gap-3 text-[13px]">
            <div className="min-w-0 flex-1">
              <span className="mr-2 font-mono text-[11px] text-pos-ink-faint">{line.accountCode}</span>
              <span className="text-pos-ink-muted">{line.accountName}</span>
            </div>
            <div className="flex shrink-0 items-center gap-4 tabular-nums">
              {line.debitMinor > 0 ? (
                <span className="w-24 text-right text-pos-ink">{naira(line.debitMinor)}</span>
              ) : (
                <span className="w-24 text-right text-pos-ink-faint">—</span>
              )}
              {line.creditMinor > 0 ? (
                <span className="w-24 text-right font-medium text-pos-success">{naira(line.creditMinor)}</span>
              ) : (
                <span className="w-24 text-right text-pos-ink-faint">—</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex justify-between border-t border-pos-border/60 pt-2 text-xs text-pos-ink-faint">
        <span>Source ledger: {entry.source}</span>
        <span>
          Dr {naira(debit)} : Cr {naira(credit)} · {balanced ? "balanced" : "unbalanced"}
        </span>
      </p>
    </article>
  );
}

function toJournalEntry(row: LedgerJournalEntry): JournalEntry {
  const lines = row.lines.map((line) => ({
    accountCode: line.accountName,
    accountName: line.accountName,
    debitMinor: line.debitMinor,
    creditMinor: line.creditMinor,
  }));
  return {
    id: row.id,
    at: row.date,
    ref: row.number,
    memo: row.memo,
    source: "manual" as const,
    lines,
  };
}

export function JournalPage() {
  const [books, setBooks] = useState<AccountingBooks | null>(null);
  const [manual, setManual] = useState<JournalEntry[] | null>(null);
  const [source, setSource] = useState<"all" | JournalEntry["source"]>("all");

  useEffect(() => {
    Promise.all([loadAccountingBooks().catch(() => null), listJournalEntries().catch(() => [])])
      .then(([b, m]) => {
        setBooks(b);
        setManual(m.map(toJournalEntry));
      })
      .catch(() => {
        setBooks(null);
        setManual([]);
      });
  }, []);

  const entries = useMemo(() => {
    if (!books || !manual) return [];
    const all = [...books.journals, ...manual].sort((a, b) => b.at.localeCompare(a.at));
    return source === "all" ? all : all.filter((entry) => entry.source === source);
  }, [books, manual, source]);

  if (!books || !manual) return <ManagerSkeleton variant="list" />;

  const counts = {
    all: books.journals.length + manual.length,
    sale: books.journals.filter((entry) => entry.source === "sale").length,
    purchase: books.journals.filter((entry) => entry.source === "purchase").length,
    expense: books.journals.filter((entry) => entry.source === "expense").length,
    opening: books.journals.filter((entry) => entry.source === "opening").length,
    manual: manual.length,
  };

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Account · Books
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Journal</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Auto-posted entries from POS sales, purchase invoices, and expenses, plus manual entries from the Accounting
          desk.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["all", "sale", "purchase", "expense", "opening", "manual"] as const).map((key) => {
          const active = source === key;
          const meta = key === "all" ? null : SOURCE_STYLE[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSource(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium capitalize transition ${
                active
                  ? "bg-pos-primary text-white shadow-pos-primary"
                  : "bg-pos-surface text-pos-ink-muted shadow-pos-sm hover:text-pos-ink"
              }`}
            >
              {meta ? <meta.icon size={14} /> : null}
              {key === "all" ? "All posts" : meta?.label}
              <span className={`text-xs ${active ? "text-white/70" : "text-pos-ink-faint"}`}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-faint">No journal entries in this filter yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {entries.slice(0, 200).map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-pos-ink-faint">
        The journal derives from live sales, purchases, and expenses plus manual entries posted on the Accounting desk.
      </p>
    </div>
  );
}