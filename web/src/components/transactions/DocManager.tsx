"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Plus, Trash2 } from "lucide-react";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import {
  deleteDoc,
  listDocs,
  saveDoc,
  type DocKind,
  type DocStatus,
  type TradeDoc,
} from "@/lib/hq-ops";
import { naira, prettyDay, dayKey } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  fieldClass,
} from "../setup/SetupChrome";

export type DocManagerConfig = {
  kind: DocKind;
  kicker: string;
  title: string;
  copy: string;
  partyLabel: string;
  statuses: DocStatus[];
};

type LineDraft = { itemId: string; name: string; quantity: string; unitPrice: string };

const emptyLine = (): LineDraft => ({ itemId: "", name: "", quantity: "1", unitPrice: "" });

export const STATUS_TONE: Record<DocStatus, string> = {
  draft: "text-pos-ink-faint",
  open: "text-pos-primary font-medium",
  received: "text-pos-success font-medium",
  closed: "text-pos-ink-muted",
  cancelled: "text-pos-danger",
};

function statusTone(status: string) {
  return STATUS_TONE[status as DocStatus] ?? "";
}

export function DocManager({
  config,
  mode = "list",
}: {
  config: DocManagerConfig;
  mode?: "list" | "summary" | "book" | "history";
}) {
  const [docs, setDocs] = useState<TradeDoc[] | null>(null);
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [docId, setDocId] = useState<string | undefined>();
  const [number, setNumber] = useState("");
  const [party, setParty] = useState("");
  const [status, setStatus] = useState<DocStatus>("open");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  async function load() {
    const [rows, items] = await Promise.all([listDocs(config.kind), listCatalog()]);
    setDocs(rows);
    setCatalog(items);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load documents");
      setDocs([]);
    });
  }, [config.kind]);

  const filtered = useMemo(() => {
    if (!docs) return [];
    let rows = [...docs];
    if (mode === "history") {
      rows.sort((a, b) => b.at.localeCompare(a.at));
    } else if (mode === "book") {
      rows.sort((a, b) => a.number.localeCompare(b.number));
    }
    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter((row) =>
        [row.number, row.party, row.status].some((value) => value.toLowerCase().includes(query)),
      );
    }
    return rows;
  }, [docs, search, mode]);

  const totals = useMemo(() => {
    if (!docs) return { count: 0, totalMinor: 0 };
    return {
      count: docs.length,
      totalMinor: docs.reduce((sum, doc) => sum + doc.totalMinor, 0),
    };
  }, [docs]);

  if (!docs) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDocId(undefined);
    setNumber("");
    setParty("");
    setStatus("open");
    setExpectedAt("");
    setNotes("");
    setLines([emptyLine()]);
    setOpen(true);
  }

  function openEdit(doc: TradeDoc) {
    setDocId(doc.id);
    setNumber(doc.number);
    setParty(doc.party);
    setStatus(doc.status);
    setExpectedAt(doc.expectedAt ? doc.expectedAt.slice(0, 10) : "");
    setNotes(doc.notes ?? "");
    setLines(
      doc.lines.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        quantity: String(line.quantity),
        unitPrice: (line.unitPriceMinor / 100).toString(),
      })),
    );
    setOpen(true);
  }

  function pickItem(index: number, itemId: string) {
    const item = catalog.find((row) => row.id === itemId);
    setLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              itemId,
              name: item?.name ?? line.name,
              unitPrice: item ? (item.priceMinor / 100).toString() : line.unitPrice,
            }
          : line,
      ),
    );
  }

  const draftTotal = lines.reduce(
    (sum, line) => sum + Math.round((parseFloat(line.unitPrice) || 0) * 100) * (parseInt(line.quantity, 10) || 0),
    0,
  );

  async function save() {
    setBusy(true);
    try {
      await saveDoc({
        id: docId,
        kind: config.kind,
        number: number || undefined,
        party,
        status,
        expectedAt: expectedAt || undefined,
        notes: notes || undefined,
        lines: lines
          .filter((line) => line.name.trim())
          .map((line) => ({
            itemId: line.itemId,
            name: line.name,
            quantity: parseInt(line.quantity, 10) || 1,
            unitPriceMinor: Math.round((parseFloat(line.unitPrice) || 0) * 100),
          })),
      });
      await load();
      setOpen(false);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err, "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteDoc(id);
      await load();
      setOpen(false);
      toast.success("Deleted.");
    } catch (err) {
      toast.error(err, "Could not delete");
    }
  }

  if (mode === "summary") {
    const byStatus = config.statuses.map((state) => ({
      state,
      count: docs.filter((doc) => doc.status === state).length,
      totalMinor: docs.filter((doc) => doc.status === state).reduce((sum, doc) => sum + doc.totalMinor, 0),
    }));
    const parties = new Map<string, { count: number; totalMinor: number }>();
    for (const doc of docs) {
      const key = doc.party || "—";
      const row = parties.get(key) ?? { count: 0, totalMinor: 0 };
      row.count += 1;
      row.totalMinor += doc.totalMinor;
      parties.set(key, row);
    }
    const topItems = new Map<string, number>();
    for (const doc of docs) {
      for (const line of doc.lines) {
        topItems.set(line.name, (topItems.get(line.name) ?? 0) + line.quantity * line.unitPriceMinor);
      }
    }
    const items = [...topItems.entries()]
      .map(([name, totalMinor]) => ({ name, totalMinor }))
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .slice(0, 10);

    return (
      <div>
        <SetupHeader kicker={config.kicker} title={`${config.title} — Summary`} copy={config.copy} />
        <div className="grid gap-6 xl:grid-cols-2">
          <DataTable columns={["Status", "Documents", "Value"]}>
            {byStatus.map((row) => (
              <tr key={row.state} className="border-b border-pos-border/60">
                <td className={`px-4 py-3 capitalize ${statusTone(row.state)}`}>{row.state}</td>
                <td className="px-4 py-3">{row.count}</td>
                <td className="px-4 py-3">{naira(row.totalMinor)}</td>
              </tr>
            ))}
            <tr className="bg-pos-surface-muted font-semibold">
              <td className="px-4 py-3">All</td>
              <td className="px-4 py-3">{totals.count}</td>
              <td className="px-4 py-3">{naira(totals.totalMinor)}</td>
            </tr>
          </DataTable>
          <DataTable columns={[config.partyLabel, "Documents", "Value"]}>
            {[...parties.entries()].length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-pos-ink-faint" colSpan={3}>
                  Nothing recorded yet.
                </td>
              </tr>
            ) : (
              [...parties.entries()]
                .sort((a, b) => b[1].totalMinor - a[1].totalMinor)
                .map(([name, row]) => (
                  <tr key={name} className="border-b border-pos-border/60">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">{naira(row.totalMinor)}</td>
                  </tr>
                ))
            )}
          </DataTable>
          <DataTable columns={["Top line item", "Value"]}>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-pos-ink-faint" colSpan={2}>
                  No line items yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.name} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{naira(item.totalMinor)}</td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SetupHeader
        kicker={config.kicker}
        title={
          mode === "book"
            ? `${config.title} — Book`
            : mode === "history"
              ? `${config.title} — History`
              : config.title
        }
        copy={
          mode === "book"
            ? "Numbered register of every document raised, in sequence."
            : mode === "history"
              ? "Chronological archive including closed and cancelled documents."
              : config.copy
        }
        action={<PrimaryButton onClick={openNew}>New {config.title.toLowerCase().replace(/s$/, "")}</PrimaryButton>}
      />
      <label className="relative mb-4 block">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search…"
          className="w-full rounded-full border border-pos-border bg-pos-surface px-4 py-2.5 text-sm text-pos-ink outline-none focus:border-pos-primary"
        />
      </label>
      <DataTable
        columns={[
          "#",
          config.partyLabel,
          "Date",
          ...(config.kind === "purchase-order" || config.kind === "sales-quote" ? ["Expected"] : []),
          "Status",
          "Total",
        ]}
      >
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={5}>
              Nothing recorded yet.
            </td>
          </tr>
        ) : (
          filtered.map((doc) => (
            <tr
              key={doc.id}
              className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
              onClick={() => openEdit(doc)}
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{doc.number}</td>
              <td className="px-4 py-3 font-medium">{doc.party || "—"}</td>
              <td className="px-4 py-3">{prettyDay(dayKey(doc.at))}</td>
              {config.kind === "purchase-order" || config.kind === "sales-quote" ? (
                <td className="px-4 py-3">{doc.expectedAt ? prettyDay(dayKey(doc.expectedAt)) : "—"}</td>
              ) : null}
              <td className={`px-4 py-3 capitalize ${statusTone(doc.status)}`}>{doc.status}</td>
              <td className="px-4 py-3">{naira(doc.totalMinor)}</td>
            </tr>
          ))
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={docId ? `Edit ${number || "document"}` : `New ${config.title.toLowerCase().replace(/s$/, "")}`}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {docId ? (
              <button
                type="button"
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
                onClick={() => remove(docId)}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton className="flex-1" disabled={busy} onClick={save}>
              Save · {naira(draftTotal)}
            </PrimaryButton>
          </div>
        }
      >
        <Field label={`Number (auto if blank)`}>
          <input className={fieldClass} value={number} onChange={(event) => setNumber(event.target.value)} />
        </Field>
        <Field label={config.partyLabel}>
          <input className={fieldClass} value={party} onChange={(event) => setParty(event.target.value)} />
        </Field>
        <Field label="Status">
          <select
            className={fieldClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as DocStatus)}
          >
            {config.statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        {config.kind === "purchase-order" || config.kind === "sales-quote" ? (
          <Field label="Expected / valid until">
            <input
              type="date"
              className={fieldClass}
              value={expectedAt}
              onChange={(event) => setExpectedAt(event.target.value)}
            />
          </Field>
        ) : null}

        <p className="mb-2 mt-4 text-sm font-medium text-pos-ink">Lines</p>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="rounded-xl border border-pos-border p-3">
              <select
                className={`${fieldClass} mb-2`}
                value={line.itemId}
                onChange={(event) => pickItem(index, event.target.value)}
              >
                <option value="">Custom item…</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
              {!line.itemId ? (
                <input
                  placeholder="Item name"
                  className={`${fieldClass} mb-2`}
                  value={line.name}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                    )
                  }
                />
              ) : null}
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className={fieldClass}
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((row, i) => (i === index ? { ...row, quantity: event.target.value } : row)),
                    )
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit price ₦"
                  className={fieldClass}
                  value={line.unitPrice}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((row, i) => (i === index ? { ...row, unitPrice: event.target.value } : row)),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Remove line"
                  className="grid w-10 shrink-0 place-items-center rounded-xl border border-pos-border text-pos-ink-faint hover:text-pos-danger"
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 flex items-center gap-1 text-sm font-medium text-pos-primary"
          onClick={() => setLines((current) => [...current, emptyLine()])}
        >
          <Plus size={15} /> Add line
        </button>

        <Field label="Notes">
          <textarea
            rows={2}
            className={fieldClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </SlideOver>
    </div>
  );
}

export const PURCHASE_ORDER_CONFIG: DocManagerConfig = {
  kind: "purchase-order",
  kicker: "Transaction · Purchase · Order",
  title: "Orders",
  copy: "Raise purchase orders, send them to vendors, and mark them received when stock lands.",
  partyLabel: "Vendor",
  statuses: ["draft", "open", "received", "cancelled"],
};

export const PURCHASE_INVOICE_CONFIG: DocManagerConfig = {
  kind: "purchase-invoice",
  kicker: "Transaction · Purchase · Invoice",
  title: "Invoices",
  copy: "Bills received from vendors. Input VAT on these invoices offsets your output tax.",
  partyLabel: "Vendor",
  statuses: ["open", "received", "closed", "cancelled"],
};

export const PURCHASE_RETURN_CONFIG: DocManagerConfig = {
  kind: "purchase-return",
  kicker: "Transaction · Purchase · Return",
  title: "Returns",
  copy: "Goods sent back to vendors for credit or replacement.",
  partyLabel: "Vendor",
  statuses: ["open", "closed", "cancelled"],
};

export const SALES_QUOTE_CONFIG: DocManagerConfig = {
  kind: "sales-quote",
  kicker: "Report · Sales · Quote",
  title: "Quotes",
  copy: "Estimates issued to customers. Convert accepted quotes to invoices at the till.",
  partyLabel: "Customer",
  statuses: ["draft", "open", "closed", "cancelled"],
};

export const SALES_RETURN_CONFIG: DocManagerConfig = {
  kind: "sales-return",
  kicker: "Report · Sales · Return",
  title: "Returns",
  copy: "Customer refunds and returns recorded against original tickets.",
  partyLabel: "Customer",
  statuses: ["open", "closed", "cancelled"],
};
