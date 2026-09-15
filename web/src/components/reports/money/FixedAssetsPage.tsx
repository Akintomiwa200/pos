"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, PencilRuler, TrendingDown } from "lucide-react";
import { loadAccountingBooks } from "@/lib/hq-accounting";
import { listExpenses, naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";
import { listFixedAssets, type LedgerFixedAsset } from "@/lib/hq-ledger";
import type { HqExpense } from "@/lib/hq-ops";

const CAPITAL_HINTS = ["asset", "equipment", "furniture", "fixture", "machine", "machinery", "vehicle", "van", "computer", "hardware", "server", "software", "refrigerat", "dispenser", "generator", "shelf", "safe", "scale"];

function isCapitalExpense(account: string) {
  const a = account.toLowerCase();
  return CAPITAL_HINTS.some((hint) => a.includes(hint));
}

export function FixedAssetsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [expenses, setExpenses] = useState<HqExpense[] | null>(null);
  const [assets, setAssets] = useState<LedgerFixedAsset[] | null>(null);
  const [books, setBooks] = useState<{ cashMinor: number; salesMinor: number } | null>(null);

  useEffect(() => {
    Promise.all([listExpenses(), loadAccountingBooks(), listFixedAssets()])
      .then(([e, b, a]) => {
        setExpenses(e);
        setAssets(a);
        setBooks({ cashMinor: b.cashMinor, salesMinor: b.salesMinor });
      })
      .catch(() => {
        setExpenses([]);
        setAssets([]);
        setBooks(null);
      });
  }, []);

  const rows = useMemo(() => {
    if (!expenses || !assets) return null;
    const additions = expenses.filter((row) => isCapitalExpense(row.account));
    const byAsset = new Map<string, { count: number; costMinor: number; lastAt: string }>();
    for (const row of additions) {
      const key = row.account;
      const asset = byAsset.get(key) ?? { count: 0, costMinor: 0, lastAt: "" };
      asset.count += 1;
      asset.costMinor += row.amountMinor;
      if (!asset.lastAt || row.at > asset.lastAt) asset.lastAt = row.at;
      byAsset.set(key, asset);
    }
    const ledgerLines = assets.length
      ? [{ asset: "Registered assets", count: assets.length, costMinor: assets.reduce((sum, row) => sum + row.costMinor, 0), lastAt: assets.map((row) => row.acquiredAt).sort().at(-1) ?? "" }]
      : [];
    const lines = [...ledgerLines, ...[...byAsset.entries()]
      .map(([asset, row]) => ({ asset, ...row }))]
      .sort((a, b) => b.costMinor - a.costMinor);
    const costMinor = lines.reduce((sum, row) => sum + row.costMinor, 0);
    const count = lines.reduce((sum, row) => sum + row.count, 0);
    const plc = Math.min(1, books?.cashMinor && books.cashMinor > 0 && costMinor > 0 ? costMinor / Math.max(costMinor, books.salesMinor * 0.2) : 0);
    return { lines, costMinor, count, plc };
  }, [expenses, assets, books]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Money · Fixed assets</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Fixed assets</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            The register of big-ticket items bought through expense books that mention assets, equipment, fixtures and
            machinery.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><TrendingDown size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Asset classes</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.lines.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">registered and expense-detected</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Archive size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Additions (cost)</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.costMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across {rows.count} entries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PencilRuler size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Depreciation</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {assets && assets.length
                    ? naira(assets.reduce((sum, row) => sum + Math.round((row.costMinor - row.salvageMinor) / Math.max(1, row.lifeYears)), 0))
                    : "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">{assets?.length ? "straight line, per year" : "register assets to book it"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Capital register</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Assets registered on the Accounting desk plus expense lines whose account name reads as capital. Registered
            assets carry a straight-line depreciation figure.
          </p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No capital purchases detected — name an expense account with words like Equipment or Furniture and capital
            entries will appear here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Asset class</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Entries</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Latest</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.lines.map((row) => (
                    <tr key={row.asset}>
                      <td className="px-4 py-3 text-[13px] font-medium text-pos-ink">{row.asset}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">{row.count}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink-muted">
                        {new Date(row.lastAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.costMinor)}</td>
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