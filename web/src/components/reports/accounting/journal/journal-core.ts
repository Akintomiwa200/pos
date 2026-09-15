import { BookOpen, FileSpreadsheet, PencilLine, Receipt, ShoppingCart, type LucideIcon } from "lucide-react";
import type { JournalEntry, JournalLine } from "@/lib/hq-accounting";

export type SourceKey = JournalEntry["source"] | "all";
export type PeriodKey = "all" | "today" | "7d" | "month" | "year";
export type JournalTab = "postings" | "ledger" | "activity";

export type AccountImpact = {
  code: string;
  name: string;
  postings: number;
  debitMinor: number;
  creditMinor: number;
  netMinor: number;
};

export const SOURCE_STYLE: Record<
  JournalEntry["source"],
  { label: string; icon: LucideIcon; chip: string; dot: string }
> = {
  sale: {
    label: "Sale",
    icon: Receipt,
    chip: "bg-pos-success-soft text-pos-success",
    dot: "bg-pos-success",
  },
  purchase: {
    label: "Purchase",
    icon: ShoppingCart,
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  expense: {
    label: "Expense",
    icon: FileSpreadsheet,
    chip: "bg-amber-50 text-pos-warning dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-pos-warning",
  },
  opening: {
    label: "Opening",
    icon: BookOpen,
    chip: "bg-pos-primary-soft text-pos-primary",
    dot: "bg-pos-primary",
  },
  manual: {
    label: "Manual",
    icon: PencilLine,
    chip: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
  },
};

export const SOURCE_ORDER: JournalEntry["source"][] = ["sale", "purchase", "expense", "opening", "manual"];

export const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];

/* ---------------- totals + filtering ---------------- */

export function entryTotals(entry: JournalEntry) {
  let debitMinor = 0;
  let creditMinor = 0;
  for (const line of entry.lines) {
    debitMinor += line.debitMinor;
    creditMinor += line.creditMinor;
  }
  return { debitMinor, creditMinor, balanced: debitMinor === creditMinor };
}

export function matchesQuery(entry: JournalEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (entry.memo.toLowerCase().includes(q)) return true;
  if (entry.ref.toLowerCase().includes(q)) return true;
  return entry.lines.some(
    (line) =>
      line.accountName.toLowerCase().includes(q) || line.accountCode.toLowerCase().includes(q),
  );
}

export function inPeriod(at: string, period: PeriodKey, now = new Date()) {
  if (period === "all") return true;
  const ts = new Date(at).getTime();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  switch (period) {
    case "today":
      return ts >= start;
    case "7d":
      return ts >= start - 6 * dayMs;
    case "month": {
      const d = new Date(at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    case "year":
      return new Date(at).getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function prettyDayKey(key: string) {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}
