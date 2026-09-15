"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, BadgeX } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDirectory } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function grossOf(sale: HqSale) {
  return (sale.lines ?? []).reduce((sum, line) => sum + line.quantity * line.unitPriceMinor, 0);
}

function parseKind(kind: string) {
  return kind === "discount"
    ? "Discounts"
    : kind === "loyalty"
      ? "Loyalty"
      : kind === "free"
        ? "Zero-total"
        : "Mismatch";
}

export function DiscountExceptionsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [members, setMembers] = useState<{ name: string; phone?: string }[]>([]);

  useEffect(() => {
    Promise.all([listSales(), listDirectory("customers")])
      .then(([s, dir]) => {
        setSales(s);
        setMembers(dir);
      })
      .catch(() => {
        setSales([]);
        setMembers([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const memberLookup = new Map<string, string>();
    for (const member of members) {
      const name = member.name.toLowerCase();
      if (!memberLookup.has(name)) memberLookup.set(name, member.name);
    }
    const exceptions: Array<{
      id: string;
      at: string;
      ticket: string;
      cashier: string;
      reason: string;
      impactMinor: number;
      kind: "discount" | "mismatch" | "free" | "loyalty";
    }> = [];
    for (const sale of sales) {
      const gross = grossOf(sale);
      const discount = gross - sale.totalMinor;
      const lines = sale.lines ?? [];
      if (discount > 0 && !sale.loyaltyNumber && !sale.customerName) {
        exceptions.push({
          id: sale.ticketId,
          at: sale.paidAt,
          ticket: sale.ticketId,
          cashier: sale.cashierName,
          reason: `Manual discount of ${naira(discount)} with no promo or card attached.`,
          impactMinor: discount,
          kind: "discount",
        });
      }
      if (discount > lines.reduce((a, line) => a + line.quantity * line.unitPriceMinor, 0) * 0.6 && discount > 0) {
        exceptions.push({
          id: `${sale.ticketId}-big`,
          at: sale.paidAt,
          ticket: sale.ticketId,
          cashier: sale.cashierName,
          reason: `Oversized single discount (${naira(discount)}) — review approval.`,
          impactMinor: discount,
          kind: "discount",
        });
      }
      if (sale.loyaltyNumber && !memberLookup.has((String(sale.loyaltyNumber)).toLowerCase().slice(0, 12))) {
        exceptions.push({
          id: `${sale.ticketId}-loy`,
          at: sale.paidAt,
          ticket: sale.ticketId,
          cashier: sale.cashierName,
          reason: `Loyalty number ${sale.loyaltyNumber} used but not found in the customer directory.`,
          impactMinor: sale.totalMinor,
          kind: "loyalty",
        });
      }
      if (sale.totalMinor <= 0) {
        exceptions.push({
          id: `${sale.ticketId}-free`,
          at: sale.paidAt,
          ticket: sale.ticketId,
          cashier: sale.cashierName,
          reason: `Ticket rung at zero or negative (${naira(sale.totalMinor)}) — possible void/free sale.`,
          impactMinor: Math.abs(sale.totalMinor),
          kind: "free",
        });
      }
      const avg = lines.length ? gross / lines.length : 0;
      if (lines.length > 0 && avg > gross && avg > 0 && gross < avg) {
        exceptions.push({
          id: `${sale.ticketId}-pc`,
          at: sale.paidAt,
          ticket: sale.ticketId,
          cashier: sale.cashierName,
          reason: `Unit prices inconsistent with ticket total — possible price override.`,
          impactMinor: discount,
          kind: "mismatch",
        });
      }
    }
    const unique = new Map<string, typeof exceptions[number]>();
    for (const exception of exceptions) {
      if (!unique.has(exception.id)) unique.set(exception.id, exception);
    }
    const list = [...unique.values()].sort((a, b) => b.impactMinor - a.impactMinor);
    const totalImpact = list.reduce((sum, row) => sum + row.impactMinor, 0);
    const byKind = new Map<string, number>();
    for (const row of list) byKind.set(parseKind(row.kind), (byKind.get(parseKind(row.kind)) ?? 0) + row.impactMinor);
    return { list, totalImpact, byKind };
  }, [sales, members]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Discount exceptions</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Discount exceptions</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Tickets where a discount was applied with no promo or card behind it, zero-total sales, unknown loyalty
            numbers, and oversized discounts worth a second look.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShieldAlert size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Exceptions found</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.list.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across every till ticket</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BadgeX size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total impact</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalImpact)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  {[...rows.byKind.keys()].map((kind) => `${kind} ${naira(rows.byKind.get(kind) ?? 0)}`).join(" · ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Exception log</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Sorted by impact; each row is one ticket needing review.</p>
        </header>
        {rows.list.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-center text-sm text-pos-ink-faint">
            No discount exceptions found. Every discount is attributable and normal-sized.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Ticket</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Reason</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Cashier</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Impact</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.list.map((row) => (
                    <tr key={row.id} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-pos-ink">{row.ticket}</td>
                      <td className="max-w-[360px] px-4 py-3 text-[13px] text-pos-ink-muted">{row.reason}</td>
                      <td className="px-4 py-3 text-[13px] text-pos-ink">{row.cashier}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-danger">
                        {row.kind === "discount" ? `-${naira(row.impactMinor)}` : naira(row.impactMinor)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-faint">{row.at.slice(0, 16)}</td>
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