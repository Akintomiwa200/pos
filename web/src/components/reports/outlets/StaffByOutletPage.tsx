"use client";

import { useEffect, useMemo, useState } from "react";
import { Store, UserRound, UsersRound, Wallet2 } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function StaffByOutletPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales()
      .then(setSales)
      .catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const map = new Map<string, Map<string, { tickets: number; spendMinor: number; lastAt: string }>>();
    for (const sale of sales) {
      const store = (sale.storeName || "Unassigned").trim();
      const staff = (sale.cashierName || "Unknown").trim();
      const storeMap = map.get(store) ?? new Map();
      const row = storeMap.get(staff) ?? { tickets: 0, spendMinor: 0, lastAt: sale.paidAt };
      row.tickets += 1;
      row.spendMinor += sale.totalMinor;
      if (sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      storeMap.set(staff, row);
      map.set(store, storeMap);
    }
    const columns = [...map.entries()].map(([store, staffMap]) => ({
      store,
      staff: [...staffMap.entries()]
        .map(([name, row]) => ({ name, ...row }))
        .sort((a, b) => b.spendMinor - a.spendMinor),
    }));
    const allStaff = new Set(columns.flatMap((col) => col.staff.map((row) => row.name)));
    return { columns, allStaff: [...allStaff], total: sales.reduce((sum, sale) => sum + sale.totalMinor, 0) };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Staff by outlet</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Staff by outlet</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Which cashiers worked which registers — sales and tickets per staff member, lined up store by store.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Store size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Outlets</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.columns.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">staff on receipts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UserRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Cashiers</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.allStaff.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">who rung a sale</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Covered sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">with a cashier on record</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Roster by store</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Ranked by money collected within each outlet.</p>
        </header>
        {rows.allStaff.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No cashier names on receipts yet — they appear as the till signs people in.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Outlet</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Cashier</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Tickets</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.columns.map((column) =>
                    column.staff.map((row, index) => (
                      <tr key={`${column.store}-${row.name}`} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3">
                          {index === 0 ? (
                            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-pos-ink">
                              <UsersRound size={14} className="text-pos-ink-faint" />
                              {column.store}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink">{row.name}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.tickets}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums" style={{ color: colors.primary }}>
                          {naira(row.spendMinor)}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}