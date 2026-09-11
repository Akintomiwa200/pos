"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, Phone, ReceiptText, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { listDocs, naira, type TradeDoc } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";
import { DIRECTORY_OF, LABELS, sameName, type EntityKind } from "./shared";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function EntityBalanceBoard({ entity }: { entity: EntityKind }) {
  const isVendor = entity === "vendor";

  const [records, setRecords] = useState<DirectoryRecord[] | null>(null);
  const [invoices, setInvoices] = useState<TradeDoc[]>([]);
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [quotes, setQuotes] = useState<TradeDoc[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    const wanted: Array<"purchase-invoice" | "purchase-order" | "sales-quote"> = isVendor
      ? ["purchase-invoice", "purchase-order"]
      : ["sales-quote"];
    Promise.all([listDirectory(DIRECTORY_OF[entity]), ...wanted.map((kind) => listDocs(kind))])
      .then((results) => {
        const docGroups = results.slice(1, 1 + wanted.length) as (TradeDoc[] | undefined)[];
        const byKind = Object.fromEntries(
          wanted.map((kind, index) => [kind, (docGroups[index] ?? []) as TradeDoc[]]),
        );
        setRecords(results[0]);
        setInvoices(byKind["purchase-invoice"] ?? []);
        setOrders(byKind["purchase-order"] ?? []);
        setQuotes(byKind["sales-quote"] ?? []);
      })
      .catch((err) => {
        toast.error(err, "Could not load balance board");
        setRecords([]);
      });
  }, [entity, isVendor]);

  const totals = useMemo(() => {
    const invoicesValue = invoices
      .filter((d) => d.status !== "cancelled")
      .reduce((sum, d) => sum + d.totalMinor, 0);
    const payableValue = invoices
      .filter((d) => ["open", "received"].includes(d.status))
      .reduce((sum, d) => sum + d.totalMinor, 0);
    const quotedValue = quotes.filter((d) => d.status === "open").reduce((sum, d) => sum + d.totalMinor, 0);
    const acceptedValue = quotes.filter((d) => d.status === "closed").reduce((sum, d) => sum + d.totalMinor, 0);
    return {
      invoiced: invoices.filter((d) => d.status !== "cancelled").length,
      invoicedValue: invoicesValue,
      payableValue,
      openPos: orders.filter((d) => d.status === "open").length,
      quotedValue,
      acceptedValue,
      openDocs: quotes.filter((d) => d.status !== "cancelled").length,
    };
  }, [invoices, orders, quotes]);

  if (!records) return <ManagerSkeleton variant="table" />;

  const items = records
    .filter((record) => {
      const query = search.trim().toLowerCase();
      const matchesQuery =
        !query ||
        record.name.toLowerCase().includes(query) ||
        (record.phone ?? "").toLowerCase().includes(query);
      const matchesStatus =
        status === "all" || (status === "active" ? record.active : !record.active);
      return matchesQuery && matchesStatus;
    })
    .map((record) => {
      if (isVendor) {
        const openInvoices = invoices.filter(
          (doc) => sameName(doc.party, record.name) && ["open", "received"].includes(doc.status),
        );
        const allInvoices = invoices.filter((doc) => sameName(doc.party, record.name));
        return {
          record,
          metric: openInvoices.reduce((sum, doc) => sum + doc.totalMinor, 0),
          metricLabel: "Payable",
          countLabel: `${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`,
          allCount: allInvoices.length,
          docs: openInvoices,
        };
      }
      const openQuotes = quotes.filter((doc) => sameName(doc.party, record.name) && doc.status !== "cancelled");
      return {
        record,
        metric: openQuotes.reduce((sum, doc) => sum + doc.totalMinor, 0),
        metricLabel: "Documented value",
        countLabel: `${openQuotes.length} document${openQuotes.length === 1 ? "" : "s"}`,
        allCount: openQuotes.length,
        docs: openQuotes,
      };
    });

  const grandTotal = items.reduce((sum, item) => sum + item.metric, 0);
  const statusChips: Array<{ key: "all" | "active" | "inactive"; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Balances · {LABELS[entity]}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{LABELS[entity]} balances</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          {isVendor
            ? "Board of what you owe suppliers — open purchase invoices net of returns. Open a card to view its statement."
            : "Board of amounts tied to each account from documents raised against it. Open a card to view its statement."}
        </p>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {isVendor ? (
          <>
            <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Invoices issued</p>
              <p className="mt-2 text-2xl font-bold text-pos-ink">{totals.invoiced}</p>
              <p className="mt-1 text-sm tabular-nums text-pos-ink-muted">{naira(totals.invoicedValue)}</p>
            </div>
            <div className="rounded-[18px] bg-pos-warning-soft p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-warning">Net payable</p>
              <p className="mt-2 text-2xl font-bold text-pos-warning">{naira(totals.payableValue)}</p>
              <p className="mt-1 text-sm text-pos-warning/80">Open + received invoices</p>
            </div>
            <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Open purchase orders</p>
              <p className="mt-2 text-2xl font-bold text-pos-ink">{totals.openPos}</p>
              <p className="mt-1 text-sm text-pos-ink-muted">Awaiting receipt</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Open quotes value</p>
              <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(totals.quotedValue)}</p>
            </div>
            <div className="rounded-[18px] bg-pos-success-soft p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-success">Accepted quotes value</p>
              <p className="mt-2 text-2xl font-bold text-pos-success">{naira(totals.acceptedValue)}</p>
            </div>
            <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Open documents</p>
              <p className="mt-2 text-2xl font-bold text-pos-ink">{totals.openDocs}</p>
              <p className="mt-1 text-sm text-pos-ink-muted">Quotes not yet closed</p>
            </div>
          </>
        )}
      </section>

      <section className="mb-5 flex flex-wrap items-center gap-3 rounded-[20px] bg-pos-surface p-3 shadow-pos-md">
        <label className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone…"
            className={`${fieldClass} w-full rounded-full pl-10`}
          />
        </label>
        <div className="flex gap-1.5">
          {statusChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setStatus(chip.key)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                status === chip.key
                  ? "bg-pos-primary text-white shadow-pos-primary"
                  : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {items.length === 0 ? (
        <section className="rounded-[20px] bg-pos-surface py-16 text-center text-pos-ink-faint shadow-pos-md">
          <ReceiptText size={30} className="mx-auto mb-3 opacity-40" />
          No {LABELS[entity].toLowerCase()} accounts match.
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ record, metric, metricLabel, countLabel, allCount }) => {
            const share = grandTotal > 0 ? Math.round((metric / grandTotal) * 100) : 0;
            return (
              <Link
                key={record.id}
                href={`/reports/balance/${entity}/${encodeURIComponent(record.id)}`}
                className="group block rounded-[20px] bg-pos-surface p-5 shadow-pos-md transition hover:-translate-y-0.5 hover:shadow-pos-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-pos-ink">{record.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pos-ink-muted">
                      {record.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {record.phone}
                        </span>
                      ) : null}
                      {record.email ? (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail size={12} /> {record.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-pos-primary-soft text-sm font-bold text-pos-primary">
                      {initials(record.name)}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        record.active ? "bg-pos-success-soft text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
                      }`}
                    >
                      {record.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-pos-ink-faint">{metricLabel}</p>
                    <p className="truncate text-xl font-bold tabular-nums text-pos-ink">{naira(metric)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      allCount === 0
                        ? "bg-pos-surface-muted text-pos-ink-faint"
                        : isVendor
                          ? "bg-rose-50 text-pos-danger dark:bg-rose-950/40"
                          : "bg-pos-primary-soft text-pos-primary"
                    }`}
                  >
                    {isVendor ? countLabel : `${allCount} doc${allCount === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-pos-surface-muted">
                  <div
                    className={`h-full rounded-full ${isVendor ? "bg-pos-warning" : "bg-pos-primary"}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] tabular-nums text-pos-ink-faint">{share}% of total</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pos-primary opacity-0 transition group-hover:opacity-100">
                    View statement <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}