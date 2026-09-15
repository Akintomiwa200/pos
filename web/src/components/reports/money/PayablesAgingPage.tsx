"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Handshake, Timer, Wallet2 } from "lucide-react";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function PayablesAgingPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [docs, setDocs] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    listDocs("purchase-invoice")
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  const rows = useMemo(() => {
    if (!docs) return null;
    const open = docs.filter((doc) => ["open", "received", "partial"].includes(doc.status));
    const bucketOf = (days: number) => (days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3);
    const perSupplier = new Map<string, { docs: TradeDoc[]; totalMinor: number }>();
    for (const doc of open) {
      const party = doc.party || "Unnamed supplier";
      const row = perSupplier.get(party) ?? { docs: [], totalMinor: 0 };
      row.docs.push(doc);
      row.totalMinor += doc.totalMinor;
      perSupplier.set(party, row);
    }
    const lines = [...perSupplier.entries()]
      .map(([supplier, data]) => {
        const maxAge = Math.max(0, ...data.docs.map((doc) => Math.floor((Date.now() - new Date(doc.at).getTime()) / 86400000)));
        return {
          supplier,
          invoices: data.docs.length,
          oldestDays: maxAge,
          bucket: bucketOf(maxAge),
          totalMinor: data.totalMinor,
        };
      })
      .sort((a, b) => b.bucket - a.bucket || b.totalMinor - a.totalMinor);
    const totals = [0, 0, 0, 0];
    const perBucketCount = [0, 0, 0, 0];
    for (const row of lines) {
      totals[row.bucket] += row.totalMinor;
      perBucketCount[row.bucket] += row.invoices;
    }
    const total = totals.reduce((sum, value) => sum + value, 0);
    return { lines, totals, perBucketCount, total, invoices: open.length };
  }, [docs]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const labels = ["0–30 days", "31–60 days", "61–90 days", "90+ days"];

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Money · Payables aging</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Payables aging</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every open purchase invoice, grouped by supplier and aged by how long it has sat unpaid.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Handshake size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Suppliers with balances</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">holding open invoices</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Timer size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total payable</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {rows.invoices} open invoice{rows.invoices === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Past 60 days</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight" style={{ color: "#fbbf24" }}>
                  {naira(rows.totals[2] + rows.totals[3])}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">getting urgent to settle</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Aging schedule</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Each supplier is aged by their oldest open invoice; a supplier can owe across several buckets if returns and
            new invoices stack up.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No open purchase invoices — payables appear when you receive stock on credit.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Supplier</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Open invoices</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Oldest</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.supplier}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.supplier}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.invoices}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                          style={
                            row.bucket === 0
                              ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                              : row.bucket === 1
                                ? { background: "rgba(251,191,36,0.12)", color: "#d97706" }
                                : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                          }
                        >
                          {row.oldestDays <= 30 ? "Current" : `${row.oldestDays}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-2xl border border-pos-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr className="border-b border-pos-border bg-pos-surface-muted">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                    <CalendarRange size={13} className="mr-1 inline" /> Aging bucket
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Invoices</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/60">
                {rows.totals.map((value, index) => (
                  <tr key={labels[index]}>
                    <td className="px-4 py-3 text-[13px] text-pos-ink">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ background: index === 0 ? "#10b981" : index === 1 ? "#f59e0b" : index === 2 ? "#f97316" : "#ef4444" }}
                      />
                      <span className="ml-2 align-middle">{labels[index]}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{rows.perBucketCount[index]}</td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(value)}</td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                      {rows.total > 0 ? `${Math.round((value / rows.total) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </div>
  );
}