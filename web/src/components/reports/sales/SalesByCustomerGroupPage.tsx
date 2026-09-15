"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers3, Tag, UsersRound } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function SalesByCustomerGroupPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [customers, setCustomers] = useState<DirectoryRecord[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listDirectory("customers")])
      .then(([s, c]) => {
        setSales(s);
        setCustomers(c);
      })
      .catch(() => {
        setSales([]);
        setCustomers([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !customers) return null;
    const groupOf = new Map<string, string>();
    for (const customer of customers) {
      const raw = customer.extra?.group;
      if (raw) groupOf.set(customer.name.toLowerCase(), String(raw));
    }
    const buckets = new Map<string, { label: string; customers: number; tickets: number; units: number; totalMinor: number }>();
    const salesByName = new Map<string, { tickets: number; units: number; totalMinor: number }>();
    for (const sale of sales) {
      const name = sale.customerName?.trim() || "Walk-in";
      const key = name.toLowerCase();
      if (key === "walk-in") continue;
      const row = salesByName.get(name) ?? { tickets: 0, units: 0, totalMinor: 0 };
      row.tickets += 1;
      row.units += (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
      row.totalMinor += sale.totalMinor;
      salesByName.set(name, row);
    }
    const bucketNames = new Set<string>();
    for (const [name, row] of salesByName) {
      const group = groupOf.get(name.toLowerCase());
      const label = group || "Ungrouped";
      bucketNames.add(label);
      const bucket = buckets.get(label) ?? { label, customers: 0, tickets: 0, units: 0, totalMinor: 0 };
      bucket.tickets += row.tickets;
      bucket.units += row.units;
      bucket.totalMinor += row.totalMinor;
      buckets.set(label, bucket);
    }
    const members = new Map<string, number>();
    for (const customer of customers) {
      const label = customer.extra?.group ? String(customer.extra.group) : "Ungrouped";
      members.set(label, (members.get(label) ?? 0) + 1);
    }
    for (const bucket of buckets.values()) {
      bucket.customers = members.get(bucket.label) ?? 0;
    }
    const all = [...buckets.values()].sort((a, b) => b.totalMinor - a.totalMinor);
    const grand = all.reduce((sum, row) => sum + row.totalMinor, 0);
    const totalCustomers = new Set(customers.filter((c) => c.extra?.group).map((c) => String(c.extra?.group))).size;
    return { all, grand, totalCustomers, named: salesByName.size };
  }, [sales, customers]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · Customer group</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sales by customer group</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Sales grouped by customer tag. Customers belong to a group through the{" "}
            <span className="underline decoration-white/40">Customers</span> directory — set a record's{" "}
            <code className="rounded bg-white/15 px-1.5 py-0.5 text-[11px]">extra.group</code> field to its group name
            and it is reflected here instantly.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Layers3 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Groups with sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.all.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  {rows.totalCustomers} groups used in the directory
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Tag size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Named buyers</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.named}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">with {naira(rows.grand)} attributed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4 flex items-center gap-2">
          <UsersRound size={16} className="text-pos-ink-faint" />
          <h2 className="font-semibold text-pos-ink">Group breakdown</h2>
        </header>
        {rows.all.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-center text-sm text-pos-ink-faint">
            No customer sales yet. Tag customers in the directory to start grouping them.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Group</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customers</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Purchases</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Units</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.all.map((row) => {
                    const share = rows.grand ? Math.round((row.totalMinor / rows.grand) * 100) : 0;
                    return (
                      <tr key={row.label} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.label}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.customers || "—"}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                        <td className="px-4 py-3">
                          <div className="ml-auto flex max-w-[180px] items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                              <span className="block h-full rounded-full bg-pos-primary" style={{ width: `${share}%` }} />
                            </span>
                            <span className="w-9 text-right text-[11px] tabular-nums text-pos-ink-faint">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}