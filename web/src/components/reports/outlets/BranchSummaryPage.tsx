"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, ReceiptText, Wallet2 } from "lucide-react";
import { listBranches, type HqBranch } from "@/lib/hq-setup";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

export function BranchSummaryPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [branches, setBranches] = useState<HqBranch[] | null>(null);
  const [sales, setSales] = useState<HqSale[] | null>(null);

  useEffect(() => {
    Promise.all([listBranches().catch(() => [] as HqBranch[]), listSales().catch(() => [] as HqSale[])])
      .then(([b, s]) => {
        setBranches(b);
        setSales(s);
      })
      .catch(() => {
        setBranches([]);
        setSales([]);
      });
  }, []);

  const rows = useMemo(() => {
    if (!branches || !sales) return null;
    const perBranch = new Map<string, HqSale[]>();
    for (const branch of branches) {
      const match = branch.storeId
        ? sales.filter((sale) => sale.storeId === branch.storeId)
        : sales.filter((sale) => (sale.storeName ?? "").toLowerCase().includes(branch.name.toLowerCase()));
      if (match.length) perBranch.set(branch.name, match);
    }
    const byStoreName = new Map<string, HqSale[]>();
    for (const sale of sales) {
      const key = (sale.storeName || "Unassigned").trim();
      byStoreName.set(key, [...(byStoreName.get(key) ?? []), sale]);
    }
    const lines = branches.map((branch) => {
      const attached = perBranch.get(branch.name);
      if (!attached) {
        const byName = byStoreName.get(branch.name) ?? byStoreName.get(branch.name.toLowerCase());
        return {
          branch,
          tickets: (byName ?? []).length,
          spendMinor: (byName ?? []).reduce((sum, sale) => sum + sale.totalMinor, 0),
          lastAt: (byName ?? []).reduce<string | undefined>((acc, sale) => (acc && acc >= sale.paidAt ? acc : sale.paidAt), undefined),
        };
      }
      return {
        branch,
        tickets: attached.length,
        spendMinor: attached.reduce((sum, sale) => sum + sale.totalMinor, 0),
        lastAt: attached.reduce<string | undefined>((acc, sale) => (acc && acc >= sale.paidAt ? acc : sale.paidAt), undefined),
      };
    });
    const active = lines.filter((row) => row.tickets > 0);
    const total = active.reduce((sum, row) => sum + row.spendMinor, 0);
    const unassigned = byStoreName.get("Unassigned") ?? [];
    return { lines, total, ticketsCovered: sales.length - unassigned.length, hasUnassigned: unassigned.length > 0 };
  }, [branches, sales]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Outlets · Branch summary</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Branch summary</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            A single screen of every branch — sales collected, tickets written and the last time the till moved, matched
            from the store tag on each receipt.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Building2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Branches</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{branches?.length ?? 0}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">{rows.lines.filter((row) => row.tickets).length} with sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Wallet2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Branch sales</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.total)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">attributed to registered branches</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><MapPin size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Coverage</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">
                  {rows.ticketsCovered.toLocaleString()}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">tickets tagged to a branch{rows.hasUnassigned ? " · some unassigned" : ""}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Branches</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">Matched by store id when set, otherwise by name on the receipt.</p>
        </header>
        {rows.lines.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            No branches registered yet — add them in Setup, then tag sales to a store at the till.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.lines.map(({ branch, tickets, spendMinor, lastAt }) => (
              <div key={branch.id} className="rounded-2xl border border-pos-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-pos-ink">{branch.name}</h3>
                    <p className="mt-0.5 text-xs text-pos-ink-muted">
                      {[branch.city, branch.state].filter(Boolean).join(", ") || branch.address || "—"}
                    </p>
                  </div>
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: branch.active ? "#10b981" : "#9ca3af" }}
                  />
                </div>
                {tickets > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">Sales</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: colors.primary }}>
                        {naira(spendMinor)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">Tickets</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-pos-ink">{tickets.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-xs text-pos-ink-muted">
                      <ReceiptText size={13} />
                      Last sale {lastAt ? new Date(lastAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-pos-ink-faint">No tagged sales yet — receipts for this branch will roll in.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}