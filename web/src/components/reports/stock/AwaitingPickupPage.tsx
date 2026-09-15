"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Hourglass, PackageCheck, ShoppingBasket } from "lucide-react";
import { listDocs, naira, type DocStatus, type TradeDoc } from "@/lib/hq-ops";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const OPEN_STATUSES: DocStatus[] = ["draft", "pending_approval", "approved", "open", "partial"];

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-pos-surface-muted text-pos-ink-muted" },
  pending_approval: { label: "Awaiting approval", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  approved: { label: "Approved", tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  open: { label: "Open", tone: "bg-pos-primary/10 text-pos-primary" },
  partial: { label: "Partially fulfilled", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

export function AwaitingPickupPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [docs, setDocs] = useState<TradeDoc[] | null>(null);

  useEffect(() => {
    listDocs("sales-quote").then(setDocs).catch(() => setDocs([]));
  }, []);

  const rows = useMemo(() => {
    if (!docs) return null;
    const open = docs
      .filter((doc) => OPEN_STATUSES.includes(doc.status))
      .map((doc) => ({
        ...doc,
        units: doc.lines.reduce((sum, line) => sum + line.quantity, 0),
      }))
      .sort((a, b) => a.at.localeCompare(b.at));
    const totalMinor = open.reduce((sum, doc) => sum + doc.totalMinor, 0);
    const totalUnits = open.reduce((sum, doc) => sum + doc.units, 0);
    return { open, totalMinor, totalUnits };
  }, [docs]);

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Inventory · Awaiting pickup</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sold, awaiting pickup</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Sales documents still on the floor — ordered or approved, not yet fulfilled or received. These stand for
            deliveries, collections and pre-orders still owed to customers.
          </p>
          <div className="mt-8 grid gap-6 rounded-[20px] bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><Hourglass size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Awaiting fulfilment</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.open.length}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">documents not yet closed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><ShoppingBasket size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Units to deliver</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{rows.totalUnits.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">across all open documents</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/15 text-white"><PackageCheck size={20} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Value on hold</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight">{naira(rows.totalMinor)}</p>
                <p className="mt-0.5 truncate text-xs text-white/60">owed once fulfilled</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4">
          <h2 className="font-semibold text-pos-ink">Open sales documents</h2>
          <p className="mt-0.5 text-sm text-pos-ink-muted">
            Sold (quoted/invoiced) but not yet picked up. Fulfil or receive these in Sales → Quotes / Invoices.
          </p>
        </header>
        {rows.open.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-center text-sm text-pos-ink-faint">
            Nothing awaiting pickup — every sales document is fulfilled, received or cancelled.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Document</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Customer / party</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Units</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Amount</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Date</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.open.map((doc) => {
                    const meta = STATUS_LABEL[doc.status] ?? { label: doc.status, tone: "bg-pos-surface-muted text-pos-ink-muted" };
                    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(doc.at).getTime()) / 86400000));
                    return (
                      <tr key={doc.id} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-semibold tabular-nums text-pos-ink">{doc.number}</span>
                          <span className="ml-2 text-[11px] text-pos-ink-faint">
                            {doc.lines.length} line{doc.lines.length === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-pos-ink">{doc.party || "—"}</td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-pos-ink">{doc.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(doc.totalMinor)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-pos-ink-muted">
                            <CalendarClock size={12} />
                            {doc.at.slice(0, 10)}
                            {ageDays > 0 ? <span className="text-pos-ink-faint">· {ageDays}d ago</span> : null}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${meta.tone}`}>{meta.label}</span>
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