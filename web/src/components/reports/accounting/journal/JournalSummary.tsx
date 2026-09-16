import { BookOpen, CircleDollarSign, FileSpreadsheet, PencilLine, Receipt, Scale, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import type { JournalEntry } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import { entryTotals } from "./journal-core";

function StatCell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueClass =
    tone === "good" ? "text-pos-success" : tone === "bad" ? "text-pos-danger" : "text-pos-ink";
  return (
    <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-ink-muted">{label}</p>
      <p className={`mt-2 truncate text-[26px] font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-pos-ink-faint">{hint}</p>
    </div>
  );
}

export function JournalSummary({ entries }: { entries: JournalEntry[] }) {
  let debitMinor = 0;
  let creditMinor = 0;
  let balanced = 0;
  let largestMinor = 0;
  for (const entry of entries) {
    const totals = entryTotals(entry);
    debitMinor += totals.debitMinor;
    creditMinor += totals.creditMinor;
    if (totals.balanced) balanced += 1;
    if (totals.debitMinor > largestMinor) largestMinor = totals.debitMinor;
  }
  const inBalanced = debitMinor === creditMinor;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCell label="Entries" value={String(entries.length)} hint="Vouchers in this view" />
      <StatCell label="Total debits" value={naira(debitMinor)} hint="All Dr postings" />
      <StatCell label="Total credits" value={naira(creditMinor)} hint="All Cr postings" />
      <StatCell
        label="Balanced"
        value={`${balanced}/${entries.length}`}
        hint="Dr = Cr vouchers"
        tone={inBalanced ? "good" : "bad"}
      />
      <StatCell label="Largest posting" value={naira(largestMinor)} hint="Single voucher" />
    </div>
  );
}
