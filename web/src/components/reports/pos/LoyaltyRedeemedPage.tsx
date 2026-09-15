"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, PackageMinus, Sparkles } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { getLoyaltyProgram, listLoyaltyMembers } from "@/lib/hq-customers";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function LoyaltyRedeemedPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [members, setMembers] = useState<Array<{ id: string; name: string; cardNumber?: string; phone: string; points: number }> | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [program, setProgram] = useState<{ redeemValueMinor: number; enabled: boolean } | null>(null);

  useEffect(() => {
    Promise.all([listLoyaltyMembers(), listSales(), getLoyaltyProgram()])
      .then(([m, s, p]) => {
        setMembers(m);
        setSales(s);
        setProgram(p);
      })
      .catch(() => {
        setMembers([]);
        setSales([]);
        setProgram(null);
      });
  }, []);

  const rows = useMemo(() => {
    if (!members || !sales) return null;
    const accruedBy = new Map<string, { name: string; cardNumber?: string; points: number; spendMinor: number }>();
    for (const sale of sales) {
      if (!sale.loyaltyNumber) continue;
      const key = sale.loyaltyNumber.trim().toLowerCase();
      const row = accruedBy.get(key) ?? { name: "", cardNumber: sale.loyaltyNumber, points: 0, spendMinor: 0 };
      row.points += sale.loyaltyPointsEarned ?? 0;
      row.spendMinor += sale.totalMinor;
      accruedBy.set(key, row);
    }
    const redemptions: Array<{
      member: string;
      cardNumber: string;
      points: number;
      valueMinor: number;
      costMinor: number;
    }> = [];
    for (const member of members) {
      const key = (member.cardNumber ?? member.phone ?? member.id).trim().toLowerCase();
      const ledger = accruedBy.get(key);
      if (!ledger) continue;
      const redeemed = Math.max(0, ledger.points - member.points);
      if (redeemed > 0) {
        redemptions.push({
          member: member.name,
          cardNumber: member.cardNumber ?? "—",
          points: redeemed,
          valueMinor: redeemed * (program?.redeemValueMinor ?? 0),
          costMinor: Math.round((redeemed * (program?.redeemValueMinor ?? 0) * 4) / 5),
        });
      }
    }
    redemptions.sort((a, b) => b.valueMinor - a.valueMinor);
    const total = redemptions.reduce((sum, row) => sum + row.valueMinor, 0);
    const pointsTotal = redemptions.reduce((sum, row) => sum + row.points, 0);
    return { redemptions, total, pointsTotal };
  }, [members, sales, program]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Loyalty redeemed</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Loyalty redeemed</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Points your customers have actually spent — the gap between what they earned and what they still hold, priced
            at the program&apos;s redemption value.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackageMinus size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Redeeming members</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.redemptions.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">with a positive redemption</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Sparkles size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Points redeemed</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.pointsTotal.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  worth {naira(rows.total)} at ₦{program?.redeemValueMinor ?? 0}/pt
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Redemptions by member</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            {program?.enabled ? "Program live" : "Program disabled"} — this report prices spent points at the current
            redemption rate.
          </p>
        </header>
        {rows.redemptions.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No redemptions detected yet — points accrue on sales and are redeemed from the till.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Member</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Card</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Points redeemed</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Discount value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.redemptions.map((row) => (
                    <tr key={`${row.member}-${row.cardNumber}`} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.member}</td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{row.cardNumber}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.points.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-primary">
                        {naira(row.valueMinor)}
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