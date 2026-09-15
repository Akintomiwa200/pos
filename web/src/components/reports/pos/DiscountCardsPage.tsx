"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, CreditCard, Crown, Gem } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { getLoyaltyProgram, listLoyaltyCards, type LoyaltyCard } from "@/lib/hq-customers";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function DiscountCardsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [cards, setCards] = useState<LoyaltyCard[] | null>(null);
  const [program, setProgram] = useState<{ enabled: boolean; redeemValueMinor: number; earnPerNaira: number } | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listLoyaltyCards(), getLoyaltyProgram()])
      .then(([s, c, p]) => {
        setSales(s);
        setCards(c);
        setProgram(p);
      })
      .catch(() => {
        setSales([]);
        setCards([]);
        setProgram(null);
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !cards) return null;
    const byTier = new Map<string, { tier: string; count: number }>();
    for (const card of cards) {
      const tier = card.tier || "Standard";
      const row = byTier.get(tier) ?? { tier, count: 0 };
      row.count += 1;
      byTier.set(tier, row);
    }
    const memberSales = sales.filter((sale) => sale.loyaltyNumber);
    const memberMinor = memberSales.reduce((sum, sale) => sum + sale.totalMinor, 0);
    const earned = memberSales.reduce((sum, sale) => sum + (sale.loyaltyPointsEarned ?? 0), 0);
    const tiers = [...byTier.values()].sort((a, b) => b.count - a.count);
    return { tiers, memberMinor, earned, members: cards.length };
  }, [sales, cards]);

  if (!rows || !program) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Discount cards</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Discount card cost</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Your Gold / Silver cards, the sales they drove, and what those cards cost in discounts and loyalty value.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><CreditCard size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Cards issued</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.members}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {rows.tiers.length} tiers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><BadgePercent size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Card-linked sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.memberMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">tickets carrying a loyalty number</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Gem size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Points earned</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.earned.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  worth ≈ {naira(rows.earned * program.redeemValueMinor)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Cards by tier</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            {program.enabled ? "Program is live" : "Program is disabled"} · redeem value ₦{program.redeemValueMinor} per point.
          </p>
        </header>
        {rows.tiers.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No loyalty cards issued yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.tiers.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-3 rounded-2xl border border-pos-border p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
                  {tier.tier.toLowerCase().includes("gold") ? <Crown size={18} /> : <CreditCard size={18} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-pos-ink">{tier.tier}</p>
                  <p className="text-[12px] text-pos-ink-muted">{tier.count} cards</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}