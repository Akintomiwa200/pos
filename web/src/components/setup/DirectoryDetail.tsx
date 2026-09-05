"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveDirectoryRows } from "@/lib/live-directory-rows";
import { deleteDirectory, saveDirectory, type DirectoryName, type DirectoryRecord } from "@/lib/hq-directory";
import {
  listDocs,
  listExpenses,
  listMovements,
  naira,
  prettyDay,
  type HqExpense,
  type StockMovement,
  type TradeDoc,
} from "@/lib/hq-ops";
import { listSales, type HqSale } from "@/lib/hq-api";
import { toast } from "@/lib/toast";
import { ManagerSkeleton } from "../Skeleton";
import { Field, PrimaryButton, SetupStat, ToggleField, fieldClass, selectClass } from "./SetupChrome";
import {
  DIRECTORY_CONFIGS,
  cellValue,
  initials,
  labelize,
  prettyDate,
  setField,
  type DirectoryConfig,
  type DirectoryField,
} from "./DirectoryManager";

const sameName = (a?: string | null, b?: string | null) =>
  Boolean(a && b) && a!.trim().toLowerCase() === b!.trim().toLowerCase();

const STATUS_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  slate: "bg-pos-surface-muted text-pos-ink-muted",
  amber: "bg-amber-50 text-amber-700",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ActivityList({
  rows,
  empty,
}: {
  rows: Array<{ id: string; at: string; headline: string; sub: string; value?: string }>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-pos-ink-faint">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-pos-border/60">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-pos-ink">{row.headline}</p>
            <p className="truncate text-[12px] text-pos-ink-faint">{row.sub}</p>
          </div>
          {row.value ? (
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-pos-ink">{row.value}</p>
              <p className="text-[11px] text-pos-ink-faint">{prettyDay(row.at.slice(0, 10))}</p>
            </div>
          ) : (
            <p className="shrink-0 text-[12px] text-pos-ink-faint">{prettyDay(row.at.slice(0, 10))}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: DirectoryField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.kind === "select") {
    return (
      <Field key={field.key} label={field.label}>
        <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">— Choose —</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {labelize(option)}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.kind === "textarea") {
    return (
      <Field key={field.key} label={field.label}>
        <textarea
          rows={3}
          className={fieldClass}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    );
  }
  if (field.kind === "date") {
    return (
      <Field key={field.key} label={field.label}>
        <input
          type="date"
          className={fieldClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    );
  }
  return (
    <Field key={field.key} label={field.label}>
      <div className="flex items-center gap-2">
        <input
          className={fieldClass}
          type="text"
          inputMode={field.kind === "number" ? "decimal" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.suffix ? <span className="shrink-0 text-sm text-pos-ink-faint">{field.suffix}</span> : null}
      </div>
    </Field>
  );
}

type DetailStat = { label: string; value: string; hint?: string; tone?: "default" | "accent" | "inverse" };
type Activity = {
  title: string;
  rows: Array<{ id: string; at: string; headline: string; sub: string; value?: string }>;
  empty: string;
};

function DetailShell({
  directory,
  listHref,
  config,
  id,
  stats,
  activity,
  titleHint,
}: {
  directory: DirectoryName;
  listHref: string;
  config: DirectoryConfig;
  id: string;
  stats: DetailStat[];
  activity?: Activity;
  titleHint?: string;
}) {
  const router = useRouter();
  const { rows, ready } = useLiveDirectoryRows(directory);
  const [draft, setDraft] = useState<Partial<DirectoryRecord> | null>(null);
  const [busy, setBusy] = useState(false);

  const row = ready ? rows.find((r) => r.id === id) : undefined;

  const labels = useMemo(() => {
    const map: Record<string, string> = { name: "Name" };
    if (row) {
      for (const field of config.fields) map[field.key] = field.label;
      for (const key of ["phone", "email", "address", "note"] as const) {
        if (row[key]) map[key] = key;
      }
    }
    return map;
  }, [config.fields, row]);

  if (!ready) return <ManagerSkeleton variant="table" />;
  if (!row) {
    return (
      <div>
        <Link href={listHref} className="mb-6 inline-flex items-center gap-2 text-sm text-pos-ink-muted hover:text-pos-ink">
          ← Back to {config.title}
        </Link>
        <Card title={config.title}>
          <p className="text-sm text-pos-ink-faint">This record could not be found. It may have been deleted.</p>
        </Card>
      </div>
    );
  }

  const editing: Partial<DirectoryRecord> | DirectoryRecord = draft ?? row;

  const detailKeys = Array.from(new Set(["name", ...config.fields.map((field) => field.key)]));
  const hairline = detailKeys
    .map((key) => ({ key, label: labels[key] ?? labelize(key), value: cellValue(row, key) }))
    .filter((entry) => entry.value || entry.key === "extra.joined")
    .slice(0, 6);

  async function onSave() {
    setBusy(true);
    try {
      const saved = await saveDirectory(directory, editing);
      setDraft(null);
      toast.success(saved.active ? "Saved and live." : "Saved (paused).");
    } catch (err) {
      toast.error(err, "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await deleteDirectory(directory, id);
      toast.success("Deleted.");
      router.replace(listHref);
    } catch (err) {
      toast.error(err, "Could not delete");
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href={listHref} className="mb-6 inline-flex items-center gap-2 text-sm text-pos-ink-muted hover:text-pos-ink">
        ← Back to {config.title}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-pos-primary/10 text-lg font-semibold text-pos-primary">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              {config.kicker}
            </p>
            <h1 className="truncate text-[clamp(1.25rem,3vw,1.75rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
              {row.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                  row.active ? STATUS_CLASSES.emerald : STATUS_CLASSES.slate
                }`}
              >
                {row.active ? "Active" : "Inactive"}
              </span>
              {titleHint ? <span className="text-[12px] text-pos-ink-faint">{titleHint}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Delete
          </button>
          <PrimaryButton disabled={busy || !editing.name?.trim()} onClick={() => void onSave()}>
            {busy ? "Saving…" : "Save changes"}
          </PrimaryButton>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SetupStat key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} tone={stat.tone} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card title="Profile">
            <div className="mb-4 rounded-2xl border border-pos-border/60 bg-pos-surface-muted/60 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
                Record
              </p>
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {hairline.map((entry) => (
                  <div key={entry.key} className="min-w-0">
                    <dt className="text-[11px] text-pos-ink-faint">{entry.label}</dt>
                    <dd className="truncate text-sm font-medium text-pos-ink">{entry.value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="space-y-1">
              {config.fields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={cellValue(editing as DirectoryRecord, field.key)}
                  onChange={(value) => setDraft({ ...editing, ...setField(editing, field.key, value) })}
                />
              ))}
            </div>
            <ToggleField
              label={directory === "staff" ? "On roster" : "Active"}
              checked={editing.active ?? true}
              onChange={(active) => setDraft({ ...editing, active })}
            />
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {activity ? (
            <Card title={activity.title}>
              <ActivityList rows={activity.rows} empty={activity.empty} />
            </Card>
          ) : null}
          <Card title="Notes">
            <p className="text-sm leading-relaxed text-pos-ink-muted">
              {row.note || "No notes recorded for this record yet."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function useVendorData(name: string) {
  const [docs, setDocs] = useState<TradeDoc[]>([]);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    void Promise.all([
      listDocs("purchase-invoice").catch(() => [] as TradeDoc[]),
      listDocs("purchase-order").catch(() => [] as TradeDoc[]),
    ]).then(([invoices, orders]) => {
      if (!cancelled) {
        setDocs([...invoices, ...orders].filter((doc) => sameName(doc.party, name)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return docs;
}

export function VendorDetailPage({ id }: { id: string }) {
  const { rows: all } = useLiveDirectoryRows("vendors");
  const row = all.find((r) => r.id === id);
  const docs = useVendorData(row?.name ?? "");
  const totals = docs.reduce((sum, doc) => sum + doc.totalMinor, 0);
  const payable = docs
    .filter((doc) => doc.kind === "purchase-invoice" && ["open", "received"].includes(doc.status))
    .reduce((sum, doc) => sum + doc.totalMinor, 0);
  const activityRows = docs
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)
    .map((doc) => ({
      id: doc.id,
      at: doc.at,
      headline: `${labelize(doc.kind)} · ${doc.number}`,
      sub: `${doc.lines.length} line(s) · ${labelize(doc.status)}`,
      value: naira(doc.totalMinor),
    }));
  return (
    <DetailShell
      directory="vendors"
      listHref="/setup/vendor"
      config={DIRECTORY_CONFIGS.vendor}
      id={id}
      titleHint="Supplier account"
      stats={[
        { label: "Documents", value: String(docs.length) },
        { label: "Total value", value: naira(totals) },
        { label: "Net payable", value: naira(payable), hint: "Open + received invoices", tone: "accent" },
        { label: "Status", value: row?.active ? "Active" : "Inactive" },
      ]}
      activity={{
        title: "Purchase activity",
        rows: activityRows,
        empty: "No purchase orders or invoices against this vendor yet.",
      }}
    />
  );
}

function useStaffData(name: string) {
  const [rows, setRows] = useState<{ moves: StockMovement[]; expenses: HqExpense[] }>({
    moves: [],
    expenses: [],
  });
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    void Promise.all([
      listMovements().catch(() => [] as StockMovement[]),
      listExpenses().catch(() => [] as HqExpense[]),
    ]).then(([moves, expenses]) => {
      if (!cancelled) {
        setRows({
          moves: moves.filter((move) => sameName(move.staff, name)),
          expenses: expenses.filter((expense) => sameName(expense.staff, name)),
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return rows;
}

export function StaffDetailPage({ id }: { id: string }) {
  const { rows: all } = useLiveDirectoryRows("staff");
  const row = all.find((r) => r.id === id);
  const { moves, expenses } = useStaffData(row?.name ?? "");
  const expenseMinor = expenses.reduce((sum, expense) => sum + expense.amountMinor, 0);
  const combined = [
    ...moves.map((move) => ({
      id: move.id,
      at: move.at,
      headline: `Stock ${labelize(move.type)} · ${move.itemName} × ${move.quantity}`,
      sub: move.reason ?? `from ${move.from ?? "—"} to ${move.to ?? "—"}`,
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      at: expense.at,
      headline: expense.description || expense.account,
      sub: `${expense.account} · ${labelize(expense.method || "")}`,
      value: naira(expense.amountMinor),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
  return (
    <DetailShell
      directory="staff"
      listHref="/setup/staff"
      config={DIRECTORY_CONFIGS.staff}
      id={id}
      titleHint={
        row
          ? `${labelize(String((row.extra ?? {}).role ?? ""))} · ${labelize(String((row.extra ?? {}).department ?? ""))}`
          : undefined
      }
      stats={[
        { label: "Role", value: labelize(String((row?.extra ?? {}).role ?? "—")) },
        { label: "Department", value: labelize(String((row?.extra ?? {}).department ?? "—")) },
        { label: "Stock actions", value: String(moves.length), hint: "movements attributed" },
        { label: "Expenses", value: naira(expenseMinor), tone: "accent" },
      ]}
      activity={{
        title: "Activity",
        rows: combined,
        empty: "No stock movements or expenses attributed to this staff member yet.",
      }}
    />
  );
}

function useQuotesFor(name: string) {
  const [quotes, setQuotes] = useState<TradeDoc[]>([]);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    void listDocs("sales-quote")
      .catch(() => [] as TradeDoc[])
      .then((docs) => {
        if (!cancelled) setQuotes(docs.filter((doc) => sameName(doc.party, name)));
      });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return quotes;
}

export function SalesRepDetailPage({ id }: { id: string }) {
  const { rows: all } = useLiveDirectoryRows("sales-reps");
  const row = all.find((r) => r.id === id);
  const quotes = useQuotesFor(row?.name ?? "");
  const commissionPct = Number((row?.extra ?? {}).commissionPct ?? 0);
  const quotedMinor = quotes.reduce((sum, doc) => sum + doc.totalMinor, 0);
  const commissionMinor = Math.round((quotedMinor * commissionPct) / 100);
  const activityRows = quotes
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)
    .map((doc) => ({
      id: doc.id,
      at: doc.at,
      headline: `Sales quote · ${doc.number}`,
      sub: `${doc.lines.length} line(s) · ${labelize(doc.status)}`,
      value: naira(doc.totalMinor),
    }));
  return (
    <DetailShell
      directory="sales-reps"
      listHref="/setup/sales-representative"
      config={DIRECTORY_CONFIGS["sales-representative"]}
      id={id}
      titleHint={row ? `${labelize(String((row.extra ?? {}).territory ?? ""))} territory` : undefined}
      stats={[
        { label: "Territory", value: labelize(String((row?.extra ?? {}).territory ?? "—")) },
        { label: "Commission", value: `${String((row?.extra ?? {}).commissionPct ?? "0")}%` },
        { label: "Quoted value", value: naira(quotedMinor), hint: `${quotes.length} quotes` },
        { label: "Est. commission", value: naira(commissionMinor), tone: "accent" },
      ]}
      activity={{
        title: "Quotes on file",
        rows: activityRows,
        empty: "No sales quotes attributed to this rep yet. Attach their name to a quote to start tracking.",
      }}
    />
  );
}

function useTenderData(name: string) {
  const [sales, setSales] = useState<HqSale[]>([]);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    void listSales()
      .catch(() => [] as HqSale[])
      .then((allSales) => {
        if (!cancelled) setSales(allSales.filter((sale) => sameName(sale.tender, name)));
      });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return sales;
}

export function PaymentMethodDetailPage({ id }: { id: string }) {
  const { rows: all } = useLiveDirectoryRows("payment-methods");
  const row = all.find((r) => r.id === id);
  const usages = useTenderData(row?.name ?? "");
  const valueMinor = usages.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const activityRows = usages
    .slice()
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .slice(0, 8)
    .map((sale) => ({
      id: sale.ticketId,
      at: sale.paidAt,
      headline: `Ticket ${sale.ticketId}`,
      sub: `${sale.storeName ?? "No store"} · ${sale.cashierName || "Unknown cashier"}`,
      value: naira(sale.totalMinor),
    }));
  return (
    <DetailShell
      directory="payment-methods"
      listHref="/setup/payment-method"
      config={DIRECTORY_CONFIGS["payment-method"]}
      id={id}
      titleHint={row ? labelize(String((row.extra ?? {}).kind ?? "")) : undefined}
      stats={[
        { label: "Type", value: labelize(String((row?.extra ?? {}).kind ?? "—")) },
        { label: "Tickets", value: String(usages.length), hint: "matched by tender" },
        { label: "Tendered value", value: naira(valueMinor), tone: "accent" },
        { label: "Status", value: row?.active ? "Enabled" : "Paused" },
      ]}
      activity={{
        title: "Recent usage",
        rows: activityRows,
        empty: "No till tickets tendered with this method yet. Enable it and accept payments to start tracking.",
      }}
    />
  );
}

export function PromotionDetailPage({ id }: { id: string }) {
  const { rows: all } = useLiveDirectoryRows("promotions");
  const row = all.find((r) => r.id === id);
  const extra = row?.extra ?? {};
  const from = String(extra.validFrom ?? "");
  const to = String(extra.validTo ?? "");
  const now = new Date().toISOString().slice(0, 10);
  const live = Boolean(row?.active) && (!to || to >= now);
  const windowLabel = from && to ? `${prettyDate(from)} → ${prettyDate(to)}` : to ? `Until ${prettyDate(to)}` : "Open-ended";
  const fixedTender = String(extra.type ?? "") === "fixed";
  const valueLabel = fixedTender
    ? naira(Number(extra.value ?? 0))
    : `${String(extra.value ?? "0")}% off`;
  return (
    <DetailShell
      directory="promotions"
      listHref="/setup/sales-promotion"
      config={DIRECTORY_CONFIGS["sales-promotion"]}
      id={id}
      titleHint={fixedTender ? "Fixed amount discount" : "Percentage discount"}
      stats={[
        { label: "Value", value: valueLabel },
        { label: "Window", value: windowLabel, hint: live ? "Live now" : row?.active ? "Scheduled" : "Paused" },
        { label: "Minimum order", value: Number(extra.minOrder ?? 0) > 0 ? naira(Number(extra.minOrder)) : "None" },
        { label: "Status", value: live ? "Live" : row?.active ? "Scheduled" : "Paused", tone: live ? "accent" : "default" },
      ]}
      activity={{
        title: "How it applies at the till",
        rows: [
          {
            id: "window",
            at: to || from || now,
            headline: windowLabel,
            sub: `Valid ${from ? `from ${prettyDate(from)}` : ""}${to ? ` until ${prettyDate(to)}` : ""}`,
          },
          ...(live
            ? [
                {
                  id: "onshelf",
                  at: now,
                  headline: "Live on every till",
                  sub: "Cashiers see this discount when matching items are on the bill.",
                },
              ]
            : [
                {
                  id: "off",
                  at: to || now,
                  headline: "Not being applied",
                  sub: "Outside its window or paused — cashiers will not see it.",
                },
              ]),
        ],
        empty: "No window set for this promotion.",
      }}
    />
  );
}