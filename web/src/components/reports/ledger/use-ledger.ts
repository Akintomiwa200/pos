"use client";

import { useEffect, useMemo, useState } from "react";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { listDocs, listMovements, type StockMovement, type TradeDoc } from "@/lib/hq-ops";
import { listSales, type HqSale } from "@/lib/hq-api";
import { DIRECTORY_OF, type EntityKind } from "../entity/shared";

export type LedgerLine = {
  key: string;
  at: string;
  date: string;
  account: string;
  store?: string | null;
  source: string;
  status: string;
  ref: string;
  detail: string;
  amountMinor: number;
};

export type LedgerFilters = {
  name: string;
  from: string;
  to: string;
  store: string;
  status: string;
  source: string;
};

export const EMPTY_LEDGER_FILTERS: LedgerFilters = {
  name: "",
  from: "",
  to: "",
  store: "",
  status: "",
  source: "",
};

export function applyLedgerFilters(lines: LedgerLine[], f: LedgerFilters) {
  const query = f.name.trim().toLowerCase();
  return lines.filter((line) => {
    if (query && !line.account.toLowerCase().includes(query) && !line.ref.toLowerCase().includes(query)) {
      return false;
    }
    if (f.from && line.date < f.from) return false;
    if (f.to && line.date > f.to) return false;
    if (f.store && (line.store ?? "") !== f.store) return false;
    if (f.status && line.status !== f.status) return false;
    if (f.source && line.source !== f.source) return false;
    return true;
  });
}

export function useLedgerEntity(entity: EntityKind) {
  const isVendor = entity === "vendor";

  const [records, setRecords] = useState<DirectoryRecord[] | null>(null);
  const [invoices, setInvoices] = useState<TradeDoc[]>([]);
  const [quotes, setQuotes] = useState<TradeDoc[]>([]);
  const [sales, setSales] = useState<HqSale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setRecords(null);
    setFailed(false);
    const wanted: Array<"purchase-invoice" | "purchase-order" | "sales-quote"> = isVendor
      ? ["purchase-invoice", "purchase-order"]
      : ["sales-quote", "purchase-invoice"];
    const loadingSales = entity === "customer" || entity === "staff";
    const tasks: Promise<unknown>[] = [
      listDirectory(DIRECTORY_OF[entity]),
      ...wanted.map((kind) => listDocs(kind)),
      entity === "staff" ? listMovements() : Promise.resolve([]),
      loadingSales ? listSales() : Promise.resolve([]),
    ];
    Promise.all(tasks)
      .then((results) => {
        if (!mounted) return;
        const docGroups = results.slice(1, 1 + wanted.length) as (TradeDoc[] | undefined)[];
        const byKind = Object.fromEntries(
          wanted.map((kind, index) => [kind, (docGroups[index] ?? []) as TradeDoc[]]),
        );
        const moves = results[1 + wanted.length];
        const salesRows = results[2 + wanted.length];
        setRecords(results[0] as DirectoryRecord[]);
        setInvoices(byKind["purchase-invoice"] ?? []);
        setQuotes(byKind["sales-quote"] ?? []);
        if (Array.isArray(moves)) setMovements(moves as StockMovement[]);
        if (Array.isArray(salesRows)) setSales(salesRows as HqSale[]);
      })
      .catch(() => {
        if (!mounted) return;
        setFailed(true);
        setRecords([]);
      });
    return () => {
      mounted = false;
    };
  }, [entity, isVendor]);

  const lines = useMemo<LedgerLine[]>(() => {
    const out: LedgerLine[] = [];

    if (entity !== "staff") {
      for (const doc of [...quotes, ...invoices]) {
        const source = doc.kind === "sales-quote" ? "quote" : "invoice";
        out.push({
          key: `${source}-${doc.id}`,
          at: doc.at,
          date: doc.at.slice(0, 10),
          account: doc.party?.trim() || "Unassigned",
          store: null,
          source,
          status: doc.status,
          ref: doc.number,
          detail: `${doc.lines.length} line(s)`,
          amountMinor: doc.totalMinor,
        });
      }
    }

    if (entity === "customer") {
      for (const sale of sales) {
        const name = sale.customerName?.trim();
        if (!name) continue;
        out.push({
          key: `till-${sale.ticketId}`,
          at: sale.paidAt,
          date: sale.paidAt.slice(0, 10),
          account: name,
          store: sale.storeName ?? null,
          source: "till",
          status: "paid",
          ref: sale.ticketId,
          detail: `till · ${sale.tender}`,
          amountMinor: sale.totalMinor,
        });
      }
    } else if (entity === "staff") {
      for (const sale of sales) {
        out.push({
          key: `till-${sale.ticketId}`,
          at: sale.paidAt,
          date: sale.paidAt.slice(0, 10),
          account: sale.cashierName?.trim() || "Unassigned",
          store: sale.storeName ?? null,
          source: "till",
          status: "paid",
          ref: sale.ticketId,
          detail: `${sale.tender} · ${sale.customerName?.trim() || "walk-in"}`,
          amountMinor: sale.totalMinor,
        });
      }
      for (const move of movements) {
        const name = move.staff?.trim();
        if (!name) continue;
        out.push({
          key: `stock-${move.id}`,
          at: move.at,
          date: move.at.slice(0, 10),
          account: name,
          store: null,
          source: "stock",
          status: move.type,
          ref: move.id,
          detail: `${move.itemName} × ${move.quantity}${move.reason ? ` · ${move.reason}` : ""}`,
          amountMinor: 0,
        });
      }
    }

    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [entity, quotes, invoices, sales, movements]);

  const stores = useMemo(
    () => [...new Set(lines.map((line) => line.store).filter(Boolean) as string[])].sort(),
    [lines],
  );
  const statuses = useMemo(() => [...new Set(lines.map((line) => line.status))].sort(), [lines]);
  const sources = useMemo(() => [...new Set(lines.map((line) => line.source))].sort(), [lines]);
  const allAccounts = useMemo(
    () =>
      [...new Set([...(records ?? []).map((row) => row.name), ...lines.map((line) => line.account)])].sort(),
    [records, lines],
  );

  return {
    failed,
    records: records ?? [],
    lines,
    stores,
    statuses,
    sources,
    allAccounts,
    loaded: records !== null,
  };
}