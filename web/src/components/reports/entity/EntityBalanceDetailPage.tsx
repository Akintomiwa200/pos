"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Mail, Phone, ReceiptText } from "lucide-react";
import { toast } from "@/lib/toast";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { listDocs, naira, prettyDay, type TradeDoc } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";
import { DIRECTORY_OF, LABELS, sameName, type EntityKind } from "./shared";

export function EntityBalanceDetailPage({
  entity,
  accountId,
}: {
  entity: EntityKind;
  accountId: string;
}) {
  const isVendor = entity === "vendor";

  const [records, setRecords] = useState<DirectoryRecord[] | null>(null);
  const [invoices, setInvoices] = useState<TradeDoc[]>([]);
  const [quotes, setQuotes] = useState<TradeDoc[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  const decoded = useMemo(() => decodeURIComponent(accountId), [accountId]);

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
        setQuotes(byKind["sales-quote"] ?? []);
      })
      .catch((err) => {
        toast.error(err, "Could not load account balance");
        setRecords([]);
      });
  }, [entity, isVendor]);

  const record = useMemo(() => {
    if (!records) return null;
    return (
      records.find((row) => row.id === decoded || sameName(row.name, decoded)) ??
      null
    );
  }, [records, decoded]);

  const docs = useMemo(() => {
    if (!record) return [];
    return (isVendor ? invoices : [...quotes, ...invoices]).filter((doc) =>
      sameName(doc.party, record.name),
    );
  }, [record, isVendor, invoices, quotes]);

  const rows = useMemo(() => {
    let running = 0;
    return docs
      .filter((doc) => {
        const date = doc.at.slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        if (status && doc.status !== status) return false;
        return true;
      })
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((doc) => {
        running += doc.totalMinor;
        return { doc, running };
      });
  }, [docs, from, to, status]);

  const statuses = useMemo(() => [...new Set(docs.map((doc) => doc.status))].sort(), [docs]);

  if (!records) return <ManagerSkeleton variant="table" />;

  if (!record) {
    return (
      <div className="pb-8">
        <Link
          href={`/reports/balance/${entity}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-pos-primary hover:underline"
        >
          <ArrowLeft size={16} /> Back to {LABELS[entity].toLowerCase()} balances
        </Link>
        <section className="rounded-[20px] bg-pos-surface py-16 text-center text-pos-ink-faint shadow-pos-md">
          <ReceiptText size={30} className="mx-auto mb-3 opacity-40" />
          Account not found.
        </section>
      </div>
    );
  }

  const metric = rows.reduce((sum, row) => sum + row.doc.totalMinor, 0);
  const openCount = docs.filter((doc) => ["open", "received"].includes(doc.status)).length;
  const balance = rows.length ? rows[rows.length - 1].running : 0;

  return (
    <div className="pb-8">
      <Link
        href={`/reports/balance/${entity}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-pos-primary hover:underline"
      >
        <ArrowLeft size={16} /> Back to {LABELS[entity].toLowerCase()} balances
      </Link>

      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Balances · {LABELS[entity]} · Account
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-pos-ink">{record.name}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              record.active ? "bg-pos-success-soft text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
            }`}
          >
            {record.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-pos-ink-muted">
          {record.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} /> {record.phone}
            </span>
          ) : null}
          {record.email ? (
            <span className="inline-flex items-center gap-1.5">
              <Mail size={14} /> {record.email}
            </span>
          ) : null}
          {record.address ? (
            <span className="text-pos-ink-faint">{record.address}</span>
          ) : null}
        </div>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">
            {isVendor ? "Payable" : "Documented value"}
          </p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{naira(metric)}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Documents</p>
          <p className="mt-2 text-2xl font-bold text-pos-ink">{docs.length}</p>
          <p className="mt-1 text-sm text-pos-ink-muted">{openCount} open</p>
        </div>
        <div className="rounded-[18px] bg-pos-primary p-5 text-white shadow-pos-primary">
          <p className="text-[11px] uppercase tracking-wide text-white/70">Balance on file</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{naira(balance)}</p>
        </div>
      </section>

      <section className="mb-5 flex flex-wrap items-end gap-3 rounded-[20px] bg-pos-surface p-4 shadow-pos-md">
        <label className="min-w-[160px]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">From date</p>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={`${fieldClass} w-full`} />
        </label>
        <label className="min-w-[160px]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">To date</p>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={`${fieldClass} w-full`} />
        </label>
        <label className="min-w-[160px] flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">Status</p>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClass} w-full`}>
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 620 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5">Detail</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Value</th>
                <th className="px-5 py-3.5 text-right">Running total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    No documents match the active filters.
                  </td>
                </tr>
              ) : (
                rows.map(({ doc, running }) => (
                  <tr key={doc.id} className="hover:bg-pos-surface-muted/40">
                    <td className="whitespace-nowrap px-5 py-3">{prettyDay(doc.at.slice(0, 10))}</td>
                    <td className="px-5 py-3 font-mono text-xs text-pos-ink-muted">{doc.number}</td>
                    <td className="px-5 py-3 text-pos-ink-muted">{doc.lines.length} line(s)</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          doc.status === "cancelled"
                            ? "bg-pos-surface-muted text-pos-ink-faint"
                            : doc.status === "closed"
                              ? "bg-pos-success-soft text-pos-success"
                              : "bg-pos-warning-soft text-pos-warning"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-pos-ink">{naira(doc.totalMinor)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-pos-ink">
                      {naira(running)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                  <td className="px-5 py-3.5" colSpan={5}>
                    Balance
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">{naira(balance)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}