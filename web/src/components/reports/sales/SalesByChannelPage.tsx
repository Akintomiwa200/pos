"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Landmark, MonitorSmartphone, ReceiptText, ShoppingCart } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

type ChannelKey = "pos" | "invoice" | "web" | "other";

const CHANNEL_META: Record<ChannelKey, { label: string; icon: typeof ShoppingCart; copy: string }> = {
  pos: { label: "POS", icon: ShoppingCart, copy: "Sales rung at a till, with or without a customer attached." },
  invoice: { label: "Invoice", icon: ReceiptText, copy: "Invoiced customer sales raised outside the till." },
  web: { label: "Direct / web", icon: MonitorSmartphone, copy: "Registered customer sales logged directly to the account." },
  other: { label: "Other", icon: CreditCard, copy: "Anything that fell outside the categories above." },
};

function channelOf(sale: HqSale): ChannelKey {
  if (sale.tillKey) return "pos";
  if (sale.customerName || sale.customerPhone) {
    if (!(sale.lines ?? []).length) return "other";
    return "invoice";
  }
  return "other";
}

export function SalesByChannelPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    listSales().then(setSales).catch(() => setSales([]));
  }, []);

  const rows = useMemo(() => {
    if (!sales) return null;
    const map = new Map<ChannelKey, { totalMinor: number; tickets: number; units: number }>();
    for (const sale of sales) {
      const key = channelOf(sale);
      const row = map.get(key) ?? { totalMinor: 0, tickets: 0, units: 0 };
      row.totalMinor += sale.totalMinor;
      row.tickets += 1;
      row.units += (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
      map.set(key, row);
    }
    const all = (Object.keys(CHANNEL_META) as ChannelKey[]).map((key) => ({
      key,
      ...CHANNEL_META[key],
      totalMinor: map.get(key)?.totalMinor ?? 0,
      tickets: map.get(key)?.tickets ?? 0,
      units: map.get(key)?.units ?? 0,
    }));
    const grand = all.reduce((sum, row) => sum + row.totalMinor, 0);
    const ticketsTotal = all.reduce((sum, row) => sum + row.tickets, 0);
    return { all, grand, ticketsTotal };
  }, [sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · Channel</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sales by channel</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Where revenue is coming from — the till, invoices, direct customer receipts, and everything else.
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.all.map((row) => {
          const share = rows.grand ? Math.round((row.totalMinor / rows.grand) * 100) : 0;
          return (
            <article key={row.key} className="rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
                  <row.icon size={18} strokeWidth={1.75} />
                </span>
                <span className="rounded-full bg-pos-surface-muted px-2.5 py-1 text-[11px] font-semibold tabular-nums text-pos-ink-muted">
                  {share}%
                </span>
              </div>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">{row.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-pos-ink">{naira(row.totalMinor)}</p>
              <p className="mt-0.5 text-xs text-pos-ink-faint">
                {row.tickets} sales · {row.units.toLocaleString()} units
              </p>
            </article>
          );
        })}
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">How each channel behaves</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Average ticket and share of units, computed across {rows.ticketsTotal} sales worth {naira(rows.grand)}.
          </p>
        </header>
        <div className="overflow-x-auto overflow-hidden rounded-2xl border border-pos-border">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-pos-border bg-pos-surface-muted">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Channel</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Definition</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Units</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Avg ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/60">
              {rows.all.map((row) => (
                <tr key={row.key} className="hover:bg-pos-surface-muted/50">
                  <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.label}</td>
                  <td className="max-w-[260px] px-4 py-3 text-[13px] text-pos-ink-muted">{row.copy}</td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets}</td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                    {naira(row.tickets ? Math.round(row.totalMinor / row.tickets) : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}