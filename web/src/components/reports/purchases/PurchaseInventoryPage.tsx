"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, PackagePlus, ReceiptText } from "lucide-react";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const RECEIVED: string[] = ["received", "partial", "closed"];

export function PurchaseInventoryPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [docs, setDocs] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    listDocs("purchase-invoice").then(setDocs).catch(() => setDocs([]));
  }, []);

  const rows = useMemo(() => {
    if (!docs) return null;
    const received = docs.filter((doc) => RECEIVED.includes(doc.status));
    const map = new Map<string, { itemId: string; name: string; units: number; amountMinor: number; docs: number }>();
    for (const doc of received) {
      const docSign = doc.kind === "purchase-return" ? -1 : 1;
      for (const line of doc.lines) {
        const key = line.itemId || line.name;
        const row = map.get(key) ?? { itemId: line.itemId, name: line.name, units: 0, amountMinor: 0, docs: 0 };
        row.units += line.quantity * docSign;
        row.amountMinor += line.quantity * line.unitPriceMinor * docSign;
        row.docs += 1;
        map.set(key, row);
      }
    }
    const all = [...map.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const totalUnits = all.reduce((sum, row) => sum + row.units, 0);
    const totalMinor = all.reduce((sum, row) => sum + row.amountMinor, 0);
    return { all, totalUnits, totalMinor, docs: received.length };
  }, [docs]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Purchases · Inventory</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Purchase inventory</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Product-level purchase quantities and amounts pulled from received purchase invoices — what you are
            bringing in, and what it costs.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Boxes size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Items purchased</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.all.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {rows.docs} received invoices</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackagePlus size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Units received</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.totalUnits.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">net of returns</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ReceiptText size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Purchase value</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">at invoice prices</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">By product</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Ordered by purchase value, highest first.</p>
        </header>
        {rows.all.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No received purchase invoices yet — record purchases and they&apos;ll appear here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Product</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Quantities</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Invoices</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.all.map((row) => {
                    const share = rows.totalMinor ? Math.round((row.amountMinor / rows.totalMinor) * 100) : 0;
                    return (
                      <tr key={row.itemId || row.name} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.name}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{row.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.amountMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.docs}</td>
                        <td className="px-4 py-3">
                          <div className="ml-auto flex max-w-[160px] items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                              <span className="block h-full rounded-full" style={{ width: `${share}%`, background: colors.primary }} />
                            </span>
                            <span className="w-8 text-right text-[11px] tabular-nums text-pos-ink-faint">{share}%</span>
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