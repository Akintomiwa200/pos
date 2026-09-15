"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Gauge, ShieldCheck, UsersRound } from "lucide-react";
import { listCredits, type CustomerCredit } from "@/lib/hq-customers";
import { api } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function parseTerms(terms: string) {
  const match = terms.match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

export function CreditControlPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [credits, setCredits] = useState<CustomerCredit[] | null>(null);
  const [lastAt, setLastAt] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    Promise.all([
      listCredits().catch(() => [] as CustomerCredit[]),
      api<Array<{ customerName?: string; paidAt: string }>>("/api/sales").catch(() => []),
    ])
      .then(([creditRows, saleRows]) => {
        const last = new Map<string, string>();
        for (const sale of saleRows) {
          if (!sale.customerName) continue;
          const key = sale.customerName.trim().toLowerCase();
          if (!last.has(key) || sale.paidAt > (last.get(key) ?? "")) last.set(key, sale.paidAt);
        }
        setLastAt(last);
        setCredits(creditRows);
      })
      .catch(() => setCredits([]));
  }, []);

  const rows = useMemo(() => {
    if (!credits) return null;
    const lines = credits
      .filter((credit) => credit.active)
      .map((credit) => {
        const utilization = credit.limitMinor > 0 ? Math.round((credit.balanceMinor / credit.limitMinor) * 1000) / 10 : 0;
        const lastSale = lastAt.get(credit.customerName.trim().toLowerCase());
        const overdue = lastSale
          ? Math.max(0, Math.floor((Date.now() - new Date(lastSale).getTime()) / 86400000) - parseTerms(credit.terms))
          : 0;
        const status =
          credit.limitMinor > 0 && credit.balanceMinor > credit.limitMinor
            ? "over limit"
            : utilization >= 80
              ? "near limit"
              : overdue > 0
                ? "overdue"
                : credit.balanceMinor > 0
                  ? "in credit"
                  : "clean";
        return { ...credit, utilization, overdue, lastSale, status };
      })
      .sort((a, b) => {
        const rank = { "over limit": 0, overdue: 1, "near limit": 2, "in credit": 3, clean: 4 };
        return (rank[a.status as keyof typeof rank] ?? 5) - (rank[b.status as keyof typeof rank] ?? 5) || b.balanceMinor - a.balanceMinor;
      });
    const total = lines.reduce((sum, row) => sum + row.balanceMinor, 0);
    const risk = lines.filter((row) => row.status === "over limit" || row.status === "overdue" || row.status === "near limit").reduce((sum, row) => sum + row.balanceMinor, 0);
    return { lines, total, risk };
  }, [credits, lastAt]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Entities · Credit control</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Credit control</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The credit book at a glance — limits, utilisation, and who is drifting past their terms so you can pull the
            throttle before the write-off.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UsersRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Customers on credit</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">active credit accounts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShieldCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Outstanding book</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">credit balances today</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><AlertTriangle size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">At risk</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight" style={{ color: "#fbbf24" }}>
                  {naira(rows.risk)}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">overdue, near or over limit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Credit book</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Overall due date comes from each account&apos;s terms and the customer&apos;s most recent purchase.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No active credit accounts — add customers in Customers → Credit.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Limit</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Balance</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Used</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Terms</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-medium text-pos-ink">{row.customerName}</span>
                        <span className="ml-2 text-xs text-pos-ink-faint">{row.lastSale ? new Date(row.lastSale).toLocaleDateString() : "no sales yet"}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{naira(row.limitMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.balanceMinor)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        <div className="inline-flex w-24 items-center gap-1.5">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-pos-border">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, row.utilization)}%`,
                                background: row.utilization >= 80 ? "#ef4444" : row.utilization >= 50 ? "#f59e0b" : "#10b981",
                              }}
                            />
                          </div>
                          <span className="text-[12px] tabular-nums text-pos-ink-muted">{row.utilization}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {row.terms || "Net 30"}
                        {row.overdue > 0 && <span className="ml-1 text-red-500">+{row.overdue}d</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold"
                          style={
                            row.status === "clean"
                              ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                              : row.status === "in credit"
                                ? { background: "rgba(59,130,246,0.12)", color: "#3b82f6" }
                                : row.status === "near limit"
                                  ? { background: "rgba(251,191,36,0.12)", color: "#d97706" }
                                  : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                          }
                        >
                          {row.status}
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