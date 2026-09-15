"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Percent, ShoppingCart } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

function discountMinor(sale: HqSale) {
  const gross = (sale.lines ?? []).reduce((sum, line) => sum + line.quantity * line.unitPriceMinor, 0);
  return Math.max(0, gross - sale.totalMinor);
}

export function PromotionsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [promotions, setPromotions] = useState<DirectoryRecord[] | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listDirectory("promotions")])
      .then(([s, p]) => {
        setSales(s);
        setPromotions(p);
      })
      .catch(() => {
        setSales([]);
        setPromotions([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !promotions) return null;
    const totalMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
    const discountMinorTotal = sales.reduce((sum, sale) => sum + discountMinor(sale), 0);
    const memberSales = sales.filter((sale) => sale.loyaltyNumber);
    const memberMinor = memberSales.reduce((sum, sale) => sum + sale.totalMinor, 0);
    const active = promotions.filter((p) => p.active);
    return { totalMinor, discountMinorTotal, memberSales: memberSales.length, memberMinor, promotions: active };
  }, [sales, promotions]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Promotions</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Promotions performance & cost</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The campaigns you&apos;re running alongside what they are moving. Discount cost is measured as the gap
            between gross ticket value and the net total rung — plus the member-attributed share of sales.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Megaphone size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Active campaigns</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.promotions.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">in the promotions registry</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Percent size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Discount given</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.discountMinorTotal)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">gross − net across all tickets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShoppingCart size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Member-attributed sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.memberMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.memberSales} tickets with a loyalty number</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Campaign registry</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Promotions live in Settings → Promotions; page each one with a note about the offer and its cost base.
          </p>
        </header>
        {rows.promotions.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No promotions defined yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.promotions.map((promo) => (
              <div key={promo.id} className="rounded-2xl border border-pos-border p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
                    <Megaphone size={15} />
                  </span>
                  <p className="truncate text-[13px] font-semibold text-pos-ink">{promo.name}</p>
                </div>
                {promo.note ? <p className="mt-2 text-[12px] leading-relaxed text-pos-ink-muted">{promo.note}</p> : null}
                {promo.extra ? (
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                    {Object.entries(promo.extra).slice(0, 4).map(([key, value]) => (
                      <span key={key} className="text-pos-ink-faint">
                        {key}: <b className="font-semibold text-pos-ink">{String(value)}</b>
                      </span>
                    ))}
                  </dl>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}