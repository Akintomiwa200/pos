"use client";

import { useEffect, useMemo, useState } from "react";
import { BringToFront, Building2, Tags } from "lucide-react";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const RECEIVED: string[] = ["received", "partial", "closed"];

export function PurchaseBreakdownPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [docs, setDocs] = useState<TradeDoc[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[] | null>(null);

  useEffect(() => {
    Promise.all([listDocs("purchase-invoice"), listCatalog()])
      .then(([d, c]) => {
        setDocs(d);
        setCatalog(c);
      })
      .catch(() => {
        setDocs([]);
        setCatalog([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!docs || !catalog) return null;
    const received = docs.filter((doc) => RECEIVED.includes(doc.status));
    const catOf = new Map(catalog.map((item) => [item.id, item.category]));
    const bySupplier = new Map<string, { supplier: string; docs: number; units: number; amountMinor: number }>();
    const byCategory = new Map<string, { category: string; units: number; amountMinor: number }>();
    for (const doc of received) {
      const supplier = doc.party || "Unknown supplier";
      const sRow = bySupplier.get(supplier) ?? { supplier, docs: 0, units: 0, amountMinor: 0 };
      sRow.docs += 1;
      bySupplier.set(supplier, sRow);
      for (const line of doc.lines) {
        const category = catOf.get(line.itemId) ?? "General";
        const units = line.quantity;
        const amount = units * line.unitPriceMinor;
        sRow.units += units;
        sRow.amountMinor += amount;
        const cRow = byCategory.get(category) ?? { category, units: 0, amountMinor: 0 };
        cRow.units += units;
        cRow.amountMinor += amount;
        byCategory.set(category, cRow);
      }
    }
    const suppliers = [...bySupplier.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const categories = [...byCategory.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const totalMinor = suppliers.reduce((sum, row) => sum + row.amountMinor, 0);
    return { suppliers, categories, totalMinor };
  }, [docs, catalog]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  const barRows = (
    rows: Array<{ label: string; amountMinor: number; hint: string }>,
    empty: string,
  ) => (
    <ul className="mt-4 space-y-3">
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-pos-ink-faint">{empty}</p>
      ) : (
        rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-pos-ink">{row.label}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-pos-ink-faint">{row.hint}</span>
              <span className="shrink-0 font-semibold tabular-nums text-pos-ink">{naira(row.amountMinor)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
              <div
                className="h-full rounded-full bg-pos-primary"
                style={{ width: `${rows[0].amountMinor ? (row.amountMinor / rows[0].amountMinor) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Purchases · Breakdown</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Purchase breakdown</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Where your buying went — grouped by supplier and by product category, from received purchase invoices.
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
              <Building2 size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">By supplier</h2>
              <p className="text-xs text-pos-ink-faint">{naira(rows.totalMinor)} spent with {rows.suppliers.length} suppliers</p>
            </div>
          </header>
          {barRows(
            rows.suppliers.map((row) => ({ label: row.supplier, amountMinor: row.amountMinor, hint: `${row.docs} docs · ${row.units.toLocaleString()} units` })),
            "No purchases recorded yet.",
          )}
        </article>

        <article className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <header className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Tags size={16} />
            </span>
            <div>
              <h2 className="font-semibold text-pos-ink">By category</h2>
              <p className="text-xs text-pos-ink-faint">Catalog category of the purchased lines</p>
            </div>
          </header>
          {barRows(
            rows.categories.map((row) => ({ label: row.category, amountMinor: row.amountMinor, hint: `${row.units.toLocaleString()} units` })),
            "No purchases recorded yet.",
          )}
        </article>
      </div>
    </div>
  );
}