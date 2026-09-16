import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { JournalEntry } from "@/lib/hq-accounting";
import { naira } from "@/lib/hq-ops";
import type { AccountImpact } from "./journal-core";

export type { AccountImpact };

function LedgerRow({ impact, index }: { impact: AccountImpact; index: number }) {
  const { debitMinor, creditMinor, netMinor } = impact;
  const dr = debitMinor - creditMinor;
  const cr = creditMinor - debitMinor;
  return (
    <tr className="border-b border-pos-border/50 transition">
      <td className="py-2.5 pl-4 font-mono text-xs text-pos-ink-faint">{impact.code}</td>
      <td className="py-2.5">{impact.name}</td>
      <td className="py-2.5 font-mono text-xs tabular-nums text-pos-ink-faint">{impact.postings}</td>
      <td className="py-2.5 text-right font-medium tabular-nums text-pos-ink">{naira(debitMinor)}</td>
      <td className="py-2.5 text-right font-medium tabular-nums text-pos-success">{naira(creditMinor)}</td>
      <td className={`py-2.5 text-right font-semibold tabular-nums ${dr > 0 ? "text-pos-ink" : "text-pos-success"}`}>
        {dr > 0 ? `${naira(dr)} Dr` : `${naira(cr)} Cr`}
      </td>
    </tr>
  );
}

function buildImpacts(entries: JournalEntry[]): AccountImpact[] {
  const byCode = new Map<string, AccountImpact>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = byCode.get(line.accountCode) ?? {
        code: line.accountCode,
        name: line.accountName,
        postings: 0,
        debitMinor: 0,
        creditMinor: 0,
        netMinor: 0,
      };
      current.postings += 1;
      current.debitMinor += line.debitMinor;
      current.creditMinor += line.creditMinor;
      current.netMinor += line.debitMinor - line.creditMinor;
      byCode.set(line.accountCode, current);
    }
  }
  return Array.from(byCode.values()).sort(
    (a, b) => Math.abs(b.netMinor) - Math.abs(a.netMinor) || a.code.localeCompare(b.code),
  );
}

export function LedgerImpactView({ entries }: { entries: JournalEntry[] }) {
  const impacts = buildImpacts(entries);
  if (impacts.length === 0) {
    return (
      <div className="grid place-items-center rounded-[20px] bg-pos-surface py-16 text-sm text-pos-ink-faint shadow-pos-md">
        No ledger impact yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
      <div className="flex items-center justify-between border-b border-pos-border/60 px-5 py-3.5">
        <h3 className="text-sm font-bold text-pos-ink">Ledger impact by account</h3>
        <span className="text-xs text-pos-ink-faint">{impacts.length} accounts touched</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-pos-border/60 text-[11px] font-bold uppercase tracking-[0.14em] text-pos-ink-muted">
              <th className="py-3 pl-5 text-left">Code</th>
              <th className="py-3 text-left">Account</th>
              <th className="py-3 text-right">Postings</th>
              <th className="py-3 text-right">Debit</th>
              <th className="py-3 text-right">Credit</th>
              <th className="py-3 pr-5 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map((impact, index) => (
              <LedgerRow key={impact.code} impact={impact} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
