"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Gift, HandCoins, TicketCheck } from "lucide-react";
import { listGiftBatches, listGiftCards, type GiftCard, type GiftCardBatch } from "@/lib/hq-customers";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function GiftCardsReportPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [cards, setCards] = useState<GiftCard[] | null>(null);
  const [batches, setBatches] = useState<GiftCardBatch[] | null>(null);

  useEffect(() => {
    Promise.all([listGiftCards(), listGiftBatches()])
      .then(([c, b]) => {
        setCards(c);
        setBatches(b);
      })
      .catch(() => {
        setCards([]);
        setBatches([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!cards || !batches) return null;
    const batchName = new Map(batches.map((batch) => [batch.id, batch.name]));
    const rows: Array<{
      code: string;
      customerName: string | undefined;
      batch: string;
      initialMinor: number;
      balanceMinor: number;
      expiresAt?: string;
      active: boolean;
    }> = cards
      .map((card) => ({
        code: card.code,
        customerName: card.customerName ?? undefined,
        batch: card.batchId ? (batchName.get(card.batchId) ?? "—") : "—",
        initialMinor: card.initialMinor,
        balanceMinor: card.balanceMinor,
        expiresAt: card.expiresAt,
        active: card.active,
      }))
      .sort((a, b) => b.initialMinor - a.initialMinor);
    const liability = cards.filter((card) => card.active).reduce((sum, card) => sum + card.balanceMinor, 0);
    const issued = cards.reduce((sum, card) => sum + card.initialMinor, 0);
    const outstandingCount = cards.filter((card) => card.active && card.balanceMinor > 0).length;
    const soon = cards
      .filter((card) => card.expiresAt && new Date(card.expiresAt).getTime() < Date.now() + 90 * 86400000)
      .sort((a, b) => a.expiresAt!.localeCompare(b.expiresAt!));
    return { rows, liability, issued, outstandingCount, soon };
  }, [cards, batches]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Point of Sale · Gift cards</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Gift cards</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Your outstanding gift-card liability — every card, its issue value, what customers still hold, and what&apos;s
            been spent.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Gift size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Issued value</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.issued)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {cards?.length ?? 0} cards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><HandCoins size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Outstanding liability</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.liability)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.outstandingCount} cards still loaded</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TicketCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Pending expiry (90d)</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.soon.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">cards expiring soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Card register</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Redeemed = issue value − current balance.</p>
        </header>
        {rows.rows.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No gift cards yet — create a batch in Customers → Gift cards.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Code</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Batch</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Issued</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Redeemed</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Balance</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.rows.map((card, index) => {
                    const expired = card.expiresAt && new Date(card.expiresAt).getTime() < Date.now();
                    return (
                      <tr key={card.code} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-[13px] font-semibold tabular-nums text-pos-ink">
                            <Coins size={13} className="text-pos-ink-faint" />
                            {card.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink">{card.customerName ?? "—"}</td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink-muted">{card.batch}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{naira(card.initialMinor)}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                          {naira(card.initialMinor - card.balanceMinor)}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(card.balanceMinor)}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              expired
                                ? "bg-pos-danger/10 text-pos-danger"
                                : !card.active
                                  ? "bg-pos-surface-muted text-pos-ink-faint"
                                  : card.balanceMinor === 0
                                    ? "bg-pos-surface-muted text-pos-ink-muted"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {expired ? "Expired" : !card.active ? "Disabled" : card.balanceMinor === 0 ? "Spent" : "Live"}
                          </span>
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