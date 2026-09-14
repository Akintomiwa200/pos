"use client";

import { useEffect, useMemo, useState } from "react";
import { ReceiptText, Search, Wallet } from "lucide-react";
import { listCatalog, listSales, type HqSale } from "@/lib/hq-api";
import { naira, prettyDay, dayKey } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { SlideOver } from "../../SlideOver";
import { fieldClass } from "../../setup/SetupChrome";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

const TENDER_TONE: Record<string, string> = {
  cash: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  transfer: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  card: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
};

function tenderChip(tender: string) {
  const fallback = "bg-pos-surface-muted text-pos-ink-muted";
  const tone = TENDER_TONE[tender.toLowerCase()] ?? fallback;
  return tone;
}

export function InvoiceListPage() {
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<HqSale | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listCatalog()])
      .then(([rows]) => setSales(rows))
      .catch(() => setSales([]));
  }, []);

  const filtered = useMemo(() => {
    if (!sales) return [];
    const rows = [...sales].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.ticketId, row.cashierName, row.tender, row.storeName ?? ""]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [sales, search]);

  if (!sales) return <ManagerSkeleton variant="table" />;

  const total = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const today = dayKey(new Date().toISOString());
  const todayCount = sales.filter((sale) => dayKey(sale.paidAt) === today).length;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Sales · Invoice
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Invoice list</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Every ticket rung up on any till — newest first. Click a row to read its line items.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-pos-border bg-pos-surface p-4 shadow-pos-md">
        <label className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket, cashier or tender…"
            className={`${fieldClass} w-full rounded-full py-2.5 pl-10`}
          />
        </label>
        <div className="flex items-center gap-2 text-sm text-pos-ink-muted">
          <Wallet size={16} className="text-pos-primary" />
          <span>
            Total <span className="font-bold tabular-nums text-pos-ink">{naira(total)}</span>
          </span>
          <span className="mx-1 text-pos-ink-faint">·</span>
          <span>
            <span className="font-bold tabular-nums text-pos-ink">{sales.length}</span> tickets
          </span>
          <span className="mx-1 text-pos-ink-faint">·</span>
          <span>
            Today <span className="font-bold tabular-nums text-pos-ink">{todayCount}</span>
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 720 }}>
            <thead>
              <tr className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                <th className="px-5 py-3.5">Ticket</th>
                <th className="px-5 py-3.5">Paid at</th>
                <th className="px-5 py-3.5">Cashier</th>
                <th className="px-5 py-3.5">Tender</th>
                <th className="px-5 py-3.5 text-center">Items</th>
                <th className="px-5 py-3.5 text-right">Total</th>
                <th className="w-10 px-3 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-pos-ink-faint">
                    <ReceiptText size={28} className="mx-auto mb-2 opacity-40" />
                    {search ? "No tickets match your search." : "No tickets recorded yet."}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 400).map((sale, index) => (
                  <tr
                    key={sale.ticketId}
                    onClick={() => setDetail(sale)}
                    className={`group cursor-pointer border-b border-pos-border/50 transition hover:bg-pos-surface-muted ${
                      index % 2 === 1 ? "bg-pos-surface-muted/30" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-pos-ink-muted">
                      {sale.ticketId}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="font-medium">{prettyDay(dayKey(sale.paidAt))}</span>
                      <span className="ml-2 text-xs text-pos-ink-faint">{timeOf(sale.paidAt)}</span>
                    </td>
                    <td className="px-5 py-3.5">{sale.cashierName || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tenderChip(
                          sale.tender,
                        )}`}
                      >
                        {sale.tender}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-grid min-w-[28px] place-items-center rounded-full bg-pos-surface-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-pos-ink-muted">
                        {sale.lines?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-pos-ink">
                      {naira(sale.totalMinor)}
                    </td>
                    <td className="px-3 py-3.5 text-right opacity-0 transition group-hover:opacity-100">
                      <span className="text-xs font-medium text-pos-primary">Open</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 400 ? (
          <p className="border-t border-pos-border px-5 py-3 text-xs text-pos-ink-faint">
            Showing the newest {400} of {filtered.length} tickets. Refine your search to narrow down.
          </p>
        ) : null}
      </section>

      <SlideOver
        open={Boolean(detail)}
        title={detail ? `Ticket ${detail.ticketId}` : ""}
        subtitle={
          detail
            ? `${detail.cashierName || "Cashier"} · ${prettyDay(dayKey(detail.paidAt))} ${timeOf(detail.paidAt)}`
            : ""
        }
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-pos-surface-muted p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">Total</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-pos-ink">{naira(detail.totalMinor)}</p>
              </div>
              <div className="rounded-2xl bg-pos-surface-muted p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">Tender</p>
                <p className="mt-1 text-lg font-bold capitalize text-pos-ink">{detail.tender}</p>
              </div>
            </div>

            {detail.lines && detail.lines.length > 0 ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-pos-ink">Line items</h3>
                <ul className="overflow-hidden rounded-2xl border border-pos-border">
                  {detail.lines.map((line, index) => (
                    <li
                      key={line.id ?? index}
                      className="flex items-center gap-3 border-b border-pos-border/60 px-4 py-3 last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-pos-ink">{line.name}</span>
                      <span className="shrink-0 text-xs text-pos-ink-muted">
                        ×{line.quantity} @ {naira(line.unitPriceMinor)}
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-pos-ink">
                        {naira(line.unitPriceMinor * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="rounded-2xl bg-pos-surface-muted p-4 text-sm text-pos-ink-faint">
                No line detail stored for this ticket.
              </p>
            )}
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}