"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Sparkles, UsersRound, Wallet2 } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listLoyaltyMembers, type LoyaltyMember } from "@/lib/hq-customers";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function LoyaltyAccruedPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [members, setMembers] = useState<LoyaltyMember[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listLoyaltyMembers(), listSales()])
      .then(([m, s]) => {
        setMembers(m);
        setSales(s);
      })
      .catch(() => {
        setMembers([]);
        setSales([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!members || !sales) return null;
    const accrued = new Map<string, { tickets: number; points: number; spendMinor: number }>();
    for (const sale of sales) {
      if (!sale.loyaltyNumber) continue;
      const key = sale.loyaltyNumber.trim().toLowerCase();
      const row = accrued.get(key) ?? { tickets: 0, points: 0, spendMinor: 0 };
      row.tickets += 1;
      row.points += sale.loyaltyPointsEarned ?? 0;
      row.spendMinor += sale.totalMinor;
      accrued.set(key, row);
    }
    const list = members.map((member) => {
      const acc = accrued.get((member.cardNumber ?? member.phone ?? member.id).trim().toLowerCase()) ??
        accrued.get((member.cardNumber ?? "").toLowerCase().replace(/^0+/, "")) ??
        accrued.get((member.phone ?? "").replace(/\D/g, "").replace(/^0+/, ""));
      const joined = acc ?? { tickets: 0, points: 0, spendMinor: 0 };
      const redeemed = Math.max(0, joined.points - member.points);
      return {
        name: member.name,
        cardNumber: member.cardNumber ?? "—",
        tickets: joined.tickets,
        spendMinor: joined.spendMinor,
        accrued: joined.points,
        redeemed,
        balance: member.points,
        active: member.active,
      };
    });
    const sorted = list.sort((a, b) => b.balance - a.balance || b.accrued - a.accrued);
    const totalBalance = members.reduce((sum, member) => sum + member.points, 0);
    const totalAccrued = sorted.reduce((sum, row) => sum + row.accrued, 0);
    return { members: sorted, totalBalance, totalAccrued, count: members.length };
  }, [members, sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Loyalty accrued</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Loyalty accrued</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Every enrolled customer&apos;s lifetime points earned from till sales, the points they have spent, and the
            balance still owed to them.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><UsersRound size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Members</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.count}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">enrolled customers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Award size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Lifetime accrued</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.totalAccrued.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">points earned on sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Outstanding balance</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.totalBalance.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">points still on customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Member points ledger</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Redeemed = accrued − current balance (where positive). Matched by card number or phone on till sales.
          </p>
        </header>
        {rows.members.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No loyalty members yet — add them in Customers → Loyalty.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Member</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Card</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Spend</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Accrued</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Redeemed</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-primary">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.members.map((row) => (
                    <tr key={`${row.name}-${row.cardNumber}`} className="hover:bg-pos-surface-muted/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-pos-ink">
                          <Sparkles size={13} className="text-pos-ink-faint" />
                          {row.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{row.cardNumber}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.tickets || "—"}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">
                        {row.spendMinor ? naira(row.spendMinor) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{row.accrued.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        <span className={row.redeemed ? "text-pos-primary" : ""}>{row.redeemed ? row.redeemed.toLocaleString() : "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-pos-ink">{row.balance.toLocaleString()}</td>
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