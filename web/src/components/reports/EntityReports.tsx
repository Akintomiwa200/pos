"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import {
  listDirectory,
  type DirectoryName,
  type DirectoryRecord,
} from "@/lib/hq-directory";
import { listDocs, listMovements, type StockMovement, type TradeDoc } from "@/lib/hq-ops";
import { listSales, type HqSale } from "@/lib/hq-api";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

export type EntityKind = "customer" | "vendor" | "sales-representative" | "staff";
export type EntityReport = "balance" | "ledger" | "trail";

const DIRECTORY_OF: Record<EntityKind, DirectoryName> = {
  customer: "customers",
  vendor: "vendors",
  "sales-representative": "sales-reps",
  staff: "staff",
};

const LABELS: Record<EntityKind, string> = {
  customer: "Customer",
  vendor: "Vendor",
  "sales-representative": "Sales Representative",
  staff: "Staff",
};

const sameName = (a?: string | null, b?: string | null) =>
  Boolean(a && b) && a!.trim().toLowerCase() === b!.trim().toLowerCase();

export function EntityReports({
  report,
  entity,
}: {
  report: EntityReport;
  entity: EntityKind;
}) {
  const [records, setRecords] = useState<DirectoryRecord[] | null>(null);
  const [docsByKind, setDocsByKind] = useState<Record<string, TradeDoc[]>>({});
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [selected, setSelected] = useState("");

  const isVendor = entity === "vendor";

  useEffect(() => {
    async function load() {
      const wanted: Array<"purchase-invoice" | "purchase-order" | "sales-quote"> =
        isVendor ? ["purchase-invoice", "purchase-order"] : ["sales-quote"];
      const results = await Promise.all([
        listDirectory(DIRECTORY_OF[entity]),
        ...wanted.map((kind) => listDocs(kind)),
        report === "trail" ? listMovements() : Promise.resolve([]),
        entity === "sales-representative" || entity === "staff"
          ? listSales()
          : Promise.resolve([]),
      ]);
      const rows = results[0];
      const docGroups = results.slice(1, 1 + wanted.length);
      const moves = results[1 + wanted.length] as StockMovement[];
      const sales = results[2 + wanted.length] as HqSale[] | never[];
      setRecords(rows);
      setDocsByKind(
        Object.fromEntries(wanted.map((kind, index) => [kind, (docGroups[index] ?? []) as TradeDoc[]])),
      );
      setMovements(moves);
      if (Array.isArray(sales)) setSalesCount(sales.length);
    }
    load().catch((err) => {
      toast.error(err, "Could not load report");
      setRecords([]);
    });
  }, [entity, report, isVendor]);

  const header = useMemo(() => {
    const label = LABELS[entity];
    const titles: Record<EntityReport, { kicker: string; title: string; copy: string }> = {
      balance: {
        kicker: `Report · Balance · ${label}`,
        title: label,
        copy: isVendor
          ? "What you owe suppliers — open purchase invoices net of returns."
          : "Amounts tied to this account from documents raised against it.",
      },
      ledger: {
        kicker: `Report · Ledger · ${label}`,
        title: label,
        copy: "Statement of every document recorded against an account, with a running total.",
      },
      trail: {
        kicker: `Report · Trail · ${label}`,
        title: label,
        copy: "Everything that happened involving this account across documents and stock.",
      },
    };
    return titles[report];
  }, [report, entity, isVendor]);

  const invoices = docsByKind["purchase-invoice"] ?? [];
  const orders = docsByKind["purchase-order"] ?? [];
  const quotes = docsByKind["sales-quote"] ?? [];

  const rowsFor = (record: DirectoryRecord) => ({
    openInvoices: invoices.filter((doc) => sameName(doc.party, record.name) && ["open", "received"].includes(doc.status)),
    allInvoices: invoices.filter((doc) => sameName(doc.party, record.name)),
    openQuotes: quotes.filter((doc) => sameName(doc.party, record.name) && doc.status !== "cancelled"),
    movements: movements.filter((move) => sameName(move.staff, record.name)),
  });

  if (!records) return <ManagerSkeleton variant="table" />;

  /* ---------------- BALANCE ---------------- */
  if (report === "balance") {
    const totals = isVendor
      ? {
          invoiced: invoices.filter((d) => d.status !== "cancelled").reduce((sum, d) => sum + d.totalMinor, 0),
          payable: invoices
            .filter((d) => ["open", "received"].includes(d.status))
            .reduce((sum, d) => sum + d.totalMinor, 0),
          quoted: 0,
          accepted: 0,
        }
      : {
          invoiced: 0,
          payable: 0,
          quoted: quotes.filter((d) => d.status === "open").reduce((sum, d) => sum + d.totalMinor, 0),
          accepted: quotes.filter((d) => d.status === "closed").reduce((sum, d) => sum + d.totalMinor, 0),
        };

    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {isVendor ? (
            <>
              <StatCard label="Total invoiced" value={naira(totals.invoiced)} hint={`${invoices.length} invoices`} />
              <StatCard label="Open POs" value={String(orders.filter((d) => d.status === "open").length)} />
              <StatCard label="Net payable" value={naira(totals.payable)} hint="Open + received invoices" />
            </>
          ) : (
            <>
              <StatCard label="Open quotes value" value={naira(totals.quoted)} />
              <StatCard label="Accepted quotes value" value={naira(totals.accepted)} />
              <StatCard label="Accounts on file" value={String(records.length)} />
            </>
          )}
        </div>
        <TableShell
          columns={
            isVendor
              ? ["Vendor", "Phone", "Invoiced", "Open invoices", "Payable"]
              : ["Name", "Phone", "Documents", "Documented value", "Status"]
          }
        >
          {records.length === 0 ? (
            <EmptyRow colSpan={5} message={`No ${LABELS[entity].toLowerCase()} accounts yet.`} />
          ) : (
            records.map((record) => {
              const info = rowsFor(record);
              if (isVendor) {
                const payable = info.openInvoices.reduce((sum, doc) => sum + doc.totalMinor, 0);
                const invoiced = info.allInvoices.reduce((sum, doc) => sum + doc.totalMinor, 0);
                return (
                  <tr key={record.id} className="border-b border-pos-border/60">
                    <td className="px-4 py-3 font-medium">{record.name}</td>
                    <td className="px-4 py-3 text-pos-ink-muted">{record.phone || "—"}</td>
                    <td className="px-4 py-3">{naira(invoiced)}</td>
                    <td className="px-4 py-3">{info.openInvoices.length}</td>
                    <td className={`px-4 py-3 font-semibold ${payable > 0 ? "text-pos-warning" : ""}`}>
                      {naira(payable)}
                    </td>
                  </tr>
                );
              }
              const documented = [...info.openQuotes, ...info.allInvoices];
              const value = documented.reduce((sum, doc) => sum + doc.totalMinor, 0);
              return (
                <tr key={record.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">{record.name}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{record.phone || "—"}</td>
                  <td className="px-4 py-3">{documented.length}</td>
                  <td className="px-4 py-3">{naira(value)}</td>
                  <td className="px-4 py-3">{record.active ? "Active" : "Inactive"}</td>
                </tr>
              );
            })
          )}
        </TableShell>
      </div>
    );
  }

  /* ---------------- LEDGER ---------------- */
  if (report === "ledger") {
    const pool = isVendor ? invoices : [...quotes, ...invoices];
    const knownParties = new Set<string>([
      ...records.map((row) => row.name),
      ...pool.map((doc) => doc.party).filter(Boolean),
    ]);
    const entries = selected
      ? pool
          .filter((doc) => sameName(doc.party, selected))
          .sort((a, b) => a.at.localeCompare(b.at))
      : [];
    let running = 0;
    const withRunning = entries.map((doc) => {
      running += doc.totalMinor;
      return { doc, running };
    });
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <label className="mb-4 block max-w-md text-sm font-medium text-pos-ink">
          Account
          <select
            className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2.5 text-sm outline-none focus:border-pos-primary"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Choose an account…</option>
            {[...knownParties].sort().map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {!selected ? (
          <TableShell columns={["Reference", "Date", "Description", "Value"]}>
            <EmptyRow colSpan={4} message="Pick an account above to draw its statement." />
          </TableShell>
        ) : (
          <TableShell columns={["Reference", "Date", "Status", "Value", "Running total"]}>
            {withRunning.length === 0 ? (
              <EmptyRow colSpan={5} message="No documents on this account yet." />
            ) : (
              withRunning.map(({ doc, running: run }) => (
                <tr key={doc.id} className="border-b border-pos-border/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{doc.number}</td>
                  <td className="px-4 py-3">{prettyDay(doc.at.slice(0, 10))}</td>
                  <td className="px-4 py-3 capitalize">{doc.status}</td>
                  <td className="px-4 py-3">{naira(doc.totalMinor)}</td>
                  <td className="px-4 py-3 font-semibold">{naira(run)}</td>
                </tr>
              ))
            )}
          </TableShell>
        )}
      </div>
    );
  }

  /* ---------------- TRAIL ---------------- */
  type TrailEntry = { id: string; at: string; source: string; detail: string; amountMinor?: number };
  const trail: TrailEntry[] = [];

  if (entity === "customer" || entity === "vendor") {
    for (const doc of [...invoices, ...(isVendor ? [] : quotes)]) {
      trail.push({
        id: doc.id,
        at: doc.at,
        source: doc.kind.replace("-", " "),
        detail: `${doc.number} · ${doc.party || "—"} · ${doc.lines.length} line(s)`,
        amountMinor: doc.totalMinor,
      });
    }
  }
  for (const move of movements) {
    trail.push({
      id: move.id,
      at: move.at,
      source: `stock ${move.type}`,
      detail: `${move.itemName} × ${move.quantity}${move.reason ? ` · ${move.reason}` : ""}`,
    });
  }
  const sortedTrail = trail.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200);

  return (
    <div>
      <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
      <TableShell columns={["When", "Source", "Detail", "Value"]}>
        {sortedTrail.length === 0 ? (
          <EmptyRow colSpan={4} message="No activity recorded yet." />
        ) : (
          sortedTrail.map((entry) => (
            <tr key={`${entry.source}-${entry.id}`} className="border-b border-pos-border/60">
              <td className="whitespace-nowrap px-4 py-3">
                {prettyDay(entry.at.slice(0, 10))} ·{" "}
                {new Date(entry.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3 capitalize">{entry.source}</td>
              <td className="px-4 py-3 font-medium">{entry.detail}</td>
              <td className="px-4 py-3">{entry.amountMinor ? naira(entry.amountMinor) : "—"}</td>
            </tr>
          ))
        )}
      </TableShell>
      {salesCount > 0 ? (
        <p className="mt-3 text-sm text-pos-ink-faint">
          {salesCount.toLocaleString()} till tickets are stored; they are attributed to cashiers rather than accounts.
        </p>
      ) : null}
    </div>
  );
}
