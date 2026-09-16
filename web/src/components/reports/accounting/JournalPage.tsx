"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadAccountingBooks, type AccountingBooks, type JournalEntry } from "@/lib/hq-accounting";
import { toast } from "@/lib/toast";
import { listJournalEntries, type LedgerJournalEntry } from "@/lib/hq-ledger";

import { JournalSummary } from "./journal/JournalSummary";
import { PostingsView } from "./journal/PostingsView";
import { LedgerImpactView } from "./journal/LedgerImpactView";
import { ActivityView } from "./journal/ActivityView";
import { allEntries, matchesQuery, inPeriod, type PeriodKey, type SourceKey, type JournalTab } from "./journal/journal-core";
import { ManagerSkeleton } from "../../Skeleton";

export function JournalPage() {
  const [books, setBooks] = useState<AccountingBooks | null>(null);
  const [manualEntries, setManualEntries] = useState<LedgerJournalEntry[]>([]);
  const [source, setSource] = useState<SourceKey>("all");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<JournalTab>("postings");

  const reload = useCallback(async () => {
    try {
      const [nextBooks, manual] = await Promise.all([
        loadAccountingBooks(),
        listJournalEntries(),
      ]);
      setBooks(nextBooks);
      setManualEntries(manual);
    } catch (error) {
      toast.error("Could not refresh journal data.");
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 15_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const manual: JournalEntry[] = useMemo(
    () =>
      manualEntries.map((row) => ({
        id: row.id,
        at: row.createdAt,
        ref: row.number,
        memo: row.memo,
        source: "manual" as const,
        lines: row.lines.map((line) => ({
          accountCode: line.accountId,
          accountName: line.accountName,
          debitMinor: line.debitMinor,
          creditMinor: line.creditMinor,
        })),
      })),
    [manualEntries],
  );

  const entries = useMemo(() => {
    if (!books) return [];
    const all = allEntries(books, manual);
    return all.filter((entry) => {
      if (source !== "all" && entry.source !== source) return false;
      if (!inPeriod(entry.at, period)) return false;
      if (!matchesQuery(entry, query)) return false;
      return true;
    });
  }, [books, manual, source, period, query]);

  if (!books) return <ManagerSkeleton />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Reports • Accounting
        </p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-pos-ink">
          Journal
          <span className="flex items-center gap-1.5 rounded-full bg-pos-success-soft px-2.5 py-1 text-xs font-medium text-pos-success">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos-success opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-pos-success"></span>
            </span>
            Live
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Auto-posted entries from sales, purchases, expenses, plus manual postings — refreshed every 15s.
        </p>
      </header>

      <JournalSummary entries={entries} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["postings", "ledger", "activity"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              tab === key
                ? "bg-pos-primary text-white shadow-pos-primary"
                : "bg-pos-surface text-pos-ink-muted shadow-pos-sm hover:text-pos-ink"
            }`}
          >
            {key === "postings" ? "Postings" : key === "ledger" ? "Ledger impact" : "Activity"}
          </button>
        ))}
      </div>

      <div className="mb-1" />
      {tab === "postings" && <PostingsView entries={entries} />}
      {tab === "ledger" && <LedgerImpactView entries={entries} />}
      {tab === "activity" && <ActivityView entries={entries} />}
    </div>
  );
}
