"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteDirectory,
  listDirectory,
  saveDirectory,
  type DirectoryName,
  type DirectoryRecord,
} from "@/lib/hq-directory";
import { useLiveDirectoryRows } from "@/lib/live-directory-rows";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  selectClass,
} from "./SetupChrome";

export type DirectoryFieldKind = "text" | "textarea" | "select" | "number" | "date";

export type DirectoryField = {
  key: string;
  label: string;
  kind?: DirectoryFieldKind;
  options?: string[];
  placeholder?: string;
  suffix?: string;
};

export type DirectoryColumn = {
  key: string;
  label: string;
  badge?: boolean;
  mono?: boolean;
  date?: boolean;
  tone?: string;
  toneFor?: (row: DirectoryRecord) => string;
  render?: (row: DirectoryRecord) => string;
};

export type DirectoryConfig = {
  directory: DirectoryName;
  kicker: string;
  title: string;
  copy: string;
  singular: string;
  columns: DirectoryColumn[];
  fields: DirectoryField[];
  secondary?: string;
  detail?: string;
  insight?: (rows: DirectoryRecord[]) => { label: string; value: string; hint?: string };
  status?: (row: DirectoryRecord) => { label: string; tone: string };
};

const TONE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  indigo: "bg-indigo-50 text-indigo-700",
  sky: "bg-sky-50 text-sky-800",
  amber: "bg-amber-50 text-amber-700",
  teal: "bg-teal-50 text-teal-700",
  orange: "bg-orange-50 text-orange-700",
  stone: "bg-stone-50 text-stone-600",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
  accent: "bg-pos-primary/10 text-pos-primary",
};

const VALUE_TONES: Record<string, string> = {
  "store manager": "emerald",
  supervisor: "sky",
  cashier: "indigo",
  baker: "amber",
  barista: "amber",
  "stock controller": "teal",
  rider: "orange",
  cleaner: "stone",
  cash: "emerald",
  card: "indigo",
  transfer: "sky",
  ussd: "violet",
  mobile: "rose",
  cheque: "stone",
  percent: "emerald",
  fixed: "indigo",
};

const STATUS_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  slate: "bg-pos-surface-muted text-pos-ink-muted",
  amber: "bg-amber-50 text-amber-700",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

export function prettyDate(value: string | number | boolean | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (!raw) return "—";
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fix(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function labelize(value: string) {
  return (value || "--")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function promotionValue(row: DirectoryRecord) {
  const extra = row.extra ?? {};
  const type = String(extra.type ?? "");
  const value = String(extra.value ?? "");
  if (type === "fixed") return `₦${Number(value).toLocaleString()} off`;
  if (type === "percent") return `${value}% off`;
  return fix(value);
}

export function cellValue(row: DirectoryRecord, key: string): string {
  if (key.startsWith("extra.")) {
    const value = (row.extra ?? {})[key.slice(6)];
    return value === null || value === undefined ? "" : String(value);
  }
  const direct = row[key as "phone" | "email" | "address" | "note"];
  return direct ?? "";
}

export function setField(
  draft: Partial<DirectoryRecord>,
  key: string,
  value: string,
): Partial<DirectoryRecord> {
  if (key.startsWith("extra.")) {
    const field = key.slice(6);
    return { ...draft, extra: { ...(draft.extra ?? {}), [field]: value } };
  }
  return { ...draft, [key]: value };
}

function defaultInsight(
  rows: DirectoryRecord[],
): { label: string; value: string; hint?: string } {
  const active = rows.filter((row) => row.active).length;
  return { label: "Inactive", value: String(rows.length - active) };
}

function defaultStatus(row: DirectoryRecord) {
  return row.active
    ? { label: "Active", tone: "emerald" }
    : { label: "Inactive", tone: "slate" };
}

export function DirectoryManager({ configKey }: { configKey: string }) {
  const router = useRouter();
  const config = DIRECTORY_CONFIGS[configKey];
  const { rows, live, ready, setRows } = useLiveDirectoryRows(config.directory);
  const [draft, setDraft] = useState<Partial<DirectoryRecord>>({
    name: "",
    active: true,
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const next = await listDirectory(config.directory);
    setRows(next);
  }

  if (!ready) return <ManagerSkeleton variant="list" />;

  const activeRows = rows.filter((row) => row.active);
  const insight = config.insight?.(rows) ?? defaultInsight(rows);
  const columns = ["Name", ...config.columns.map((column) => column.label)];

  return (
    <div>
      <SetupHeader
        kicker={config.kicker}
        title={config.title}
        copy={config.copy}
        action={
          <PrimaryButton
            onClick={() => {
              setDraft({ name: "", active: true });
              setOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New {config.singular}
            </span>
          </PrimaryButton>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SetupStat label="Total" value={String(rows.length)} />
        <SetupStat label="Active" value={String(activeRows.length)} tone="accent" />
        <SetupStat label={insight.label} value={insight.value} tone="inverse" hint={insight.hint} />
        <div className="flex min-h-[104px] flex-col justify-end rounded-[20px] border border-pos-border bg-pos-surface p-4">
          <p className="text-[13px] text-pos-ink-faint">Updates</p>
          <p
            className={`mt-auto inline-flex items-center gap-2 text-[15px] font-medium ${
              live ? "text-emerald-600" : "text-pos-ink-faint"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                live ? "animate-pulse bg-emerald-500" : "bg-pos-ink-faint/50"
              }`}
            />
            {live ? "Live" : "Connecting…"}
          </p>
          <p className="mt-2 truncate text-[12px] text-pos-ink-faint">
            Updates stream in real time
          </p>
        </div>
      </div>
      <DataTable columns={columns}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={columns.length}>
              No {config.title.toLowerCase()} yet. Add the first one to get started.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const status = (config.status ?? defaultStatus)(row);
            const sub = config.secondary
              ? cellValue(row, config.secondary) || row.email || row.phone
              : row.email || row.phone || row.address;
            const href = config.detail ? `${config.detail}/${row.id}` : undefined;
            const nameCell = (
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-[12px] font-semibold text-pos-ink-muted">
                  {initials(row.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-pos-ink">{row.name}</span>
                  <span className="block truncate text-[12px] text-pos-ink-faint">
                    {sub || "—"}
                  </span>
                </span>
              </span>
            );
            return (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-pos-border/60 transition-colors hover:bg-pos-surface-muted"
                onClick={() => {
                  if (href) {
                    router.push(href);
                  } else {
                    setDraft({ ...row });
                    setOpen(true);
                  }
                }}
              >
                <td className="px-4 py-3">
                  {href ? (
                    <Link href={href} className="block min-w-0" onClick={(event) => event.stopPropagation()}>
                      {nameCell}
                    </Link>
                  ) : (
                    <span className="block min-w-0">{nameCell}</span>
                  )}
                </td>
                {config.columns.map((column) => {
                  const raw = column.render ? column.render(row) : cellValue(row, column.key);
                  if (column.date) {
                    return (
                      <td key={column.key} className="px-4 py-3 text-pos-ink-muted">
                        {prettyDate(raw)}
                      </td>
                    );
                  }
                  if (column.badge) {
                    const tone =
                      column.toneFor?.(row) ??
                      column.tone ??
                      VALUE_TONES[raw.trim().toLowerCase()] ??
                      "stone";
                    return (
                      <td key={column.key} className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${
                            TONE_CLASSES[tone] ?? TONE_CLASSES.stone
                          }`}
                        >
                          {labelize(raw)}
                        </span>
                      </td>
                    );
                  }
                  if (column.mono) {
                    return (
                      <td
                        key={column.key}
                        className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted"
                      >
                        {fix(raw)}
                      </td>
                    );
                  }
                  return (
                    <td key={column.key} className="max-w-[260px] px-4 py-3 text-pos-ink-muted">
                      <span className="line-clamp-2">{fix(raw)}</span>
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${
                      STATUS_CLASSES[status.tone] ?? STATUS_CLASSES.slate
                    }`}
                  >
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>
      <SlideOver
        open={open}
        title={draft.id ? `Edit ${config.singular}` : `New ${config.singular}`}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
                onClick={async () => {
                  try {
                    await deleteDirectory(config.directory, draft.id!);
                    await refresh();
                    setOpen(false);
                    toast.success("Deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const saved = await saveDirectory(config.directory, draft);
                  if (draft.id) {
                    setRows(rows.map((row) => (row.id === saved.id ? saved : row)));
                  } else {
                    setRows([saved, ...rows]);
                  }
                  setOpen(false);
                  toast.success(saved.active ? "Saved and live." : "Saved (paused).");
                } catch (err) {
                  toast.error(err, "Could not save");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </PrimaryButton>
          </div>
        }
      >
        {config.fields.map((field) => {
          const value = cellValue(draft as DirectoryRecord, field.key);
          if (field.kind === "select") {
            return (
              <Field key={field.key} label={field.label}>
                <select
                  className={selectClass}
                  value={value}
                  onChange={(event) => setDraft(setField(draft, field.key, event.target.value))}
                >
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
                  onChange={(event) => setDraft(setField(draft, field.key, event.target.value))}
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
                  onChange={(event) => setDraft(setField(draft, field.key, event.target.value))}
                />
              </Field>
            );
          }
          const suffix = field.suffix ? (
            <span className="shrink-0 text-sm text-pos-ink-faint">{field.suffix}</span>
          ) : null;
          return (
            <Field key={field.key} label={field.label}>
              <div className="flex items-center gap-2">
                <input
                  className={fieldClass}
                  type={field.kind === "number" ? "text" : "text"}
                  inputMode={field.kind === "number" ? "decimal" : "text"}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(event) => setDraft(setField(draft, field.key, event.target.value))}
                />
                {suffix}
              </div>
            </Field>
          );
        })}
        <ToggleField
          label={config.directory === "staff" ? "On roster" : "Active"}
          checked={draft.active ?? true}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}

const validStatus = (row: DirectoryRecord) => {
  if (!row.active) return { label: "Paused", tone: "slate" as const };
  const to = String((row.extra ?? {}).validTo ?? "");
  const now = new Date().toISOString().slice(0, 10);
  if (to && to < now) return { label: "Ended", tone: "slate" as const };
  return { label: "Live", tone: "emerald" as const };
};

export const DIRECTORY_CONFIGS: Record<string, DirectoryConfig> = {
  customer: {
    directory: "customers",
    kicker: "Setup · Customer",
    title: "Customer",
    copy: "People and businesses you sell to on credit or keep on file for receipts.",
    singular: "customer",
    columns: [
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
    ],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "note", label: "Credit terms / note", kind: "textarea" },
    ],
  },
  vendor: {
    directory: "vendors",
    kicker: "Setup · Vendor",
    title: "Vendor",
    copy: "Suppliers you raise purchase orders and record purchase invoices against.",
    singular: "vendor",
    detail: "/setup/vendor",
    columns: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "note", label: "Note", kind: "textarea" },
    ],
  },
  "sales-representative": {
    directory: "sales-reps",
    kicker: "Setup · Sales Representative",
    title: "Sales Representative",
    copy: "Reps attached to sales for commission and leaderboard attribution.",
    singular: "sales rep",
    detail: "/setup/sales-representative",
    secondary: "extra.territory",
    columns: [
      { key: "extra.territory", label: "Territory", badge: true },
      {
        key: "extra.commissionPct",
        label: "Commission",
        badge: true,
        tone: "emerald",
        render: (row) => `${String((row.extra ?? {}).commissionPct ?? "")}%`,
      },
      { key: "phone", label: "Phone" },
    ],
    fields: [
      { key: "name", label: "Full name", placeholder: "e.g. Ada Eze" },
      { key: "extra.territory", label: "Territory", placeholder: "e.g. Lagos Mainland" },
      { key: "extra.commissionPct", label: "Commission rate", kind: "number", suffix: "%" },
      { key: "extra.monthlyTarget", label: "Monthly target", kind: "number", suffix: "₦" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "note", label: "Note", kind: "textarea" },
    ],
    insight: (rows) => ({
      label: "Territories",
      value: String(new Set(rows.map((row) => String((row.extra ?? {}).territory ?? "")).filter(Boolean)).size),
    }),
  },
  staff: {
    directory: "staff",
    kicker: "Setup · Staff",
    title: "Staff",
    copy: "Your people — roles, departments and roster status.",
    singular: "staff member",
    detail: "/setup/staff",
    secondary: "extra.role",
    columns: [
      { key: "extra.role", label: "Role", badge: true },
      { key: "extra.department", label: "Department", badge: true },
      { key: "phone", label: "Phone" },
      { key: "extra.staffCode", label: "ID", mono: true },
    ],
    fields: [
      { key: "name", label: "Full name", placeholder: "e.g. Chika Okonkwo" },
      {
        key: "extra.role",
        label: "Role",
        kind: "select",
        options: [
          "Store Manager",
          "Supervisor",
          "Cashier",
          "Baker",
          "Barista",
          "Stock Controller",
          "Rider",
          "Cleaner",
        ],
      },
      {
        key: "extra.department",
        label: "Department",
        kind: "select",
        options: ["Office", "Counter", "Bakery", "Kitchen", "Store", "Dispatch"],
      },
      { key: "extra.staffCode", label: "Staff ID", placeholder: "e.g. ST-012" },
      { key: "extra.joined", label: "Joined", kind: "date" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "note", label: "Notes", kind: "textarea" },
    ],
    insight: (rows) => ({
      label: "Departments",
      value: String(
        new Set(
          rows.map((row) => String((row.extra ?? {}).department ?? "")).filter(Boolean),
        ).size,
      ),
    }),
  },
  manufacturer: {
    directory: "manufacturers",
    kicker: "Setup · Manufacturer",
    title: "Manufacturer",
    copy: "Brands and manufacturers used when setting up catalog items.",
    singular: "manufacturer",
    columns: [{ key: "note", label: "Note" }],
    fields: [{ key: "note", label: "Note", kind: "textarea" }],
  },
  "payment-method": {
    directory: "payment-methods",
    kicker: "Setup · Payment Method",
    title: "Payment Method",
    copy: "Tenders cashiers can select at checkout — toggle each one on to offer it at the till.",
    singular: "payment method",
    detail: "/setup/payment-method",
    secondary: "extra.kind",
    columns: [
      { key: "extra.kind", label: "Type", badge: true },
      { key: "note", label: "Instructions" },
    ],
    fields: [
      { key: "name", label: "Name", placeholder: "e.g. Bank Transfer" },
      {
        key: "extra.kind",
        label: "Type",
        kind: "select",
        options: ["cash", "card", "transfer", "ussd", "mobile", "cheque"],
      },
      { key: "note", label: "Instructions at checkout", kind: "textarea" },
    ],
    insight: (rows) => ({
      label: "Methods",
      value: String(new Set(rows.map((row) => String((row.extra ?? {}).kind ?? "")).filter(Boolean)).size),
      hint: "distinct tender types",
    }),
  },
  "sales-promotion": {
    directory: "promotions",
    kicker: "Setup · Sales Promotion",
    title: "Sales Promotion",
    copy: "Discount campaigns your cashiers can apply at the till — percentage or fixed, with validity windows.",
    singular: "promotion",
    detail: "/setup/sales-promotion",
    columns: [
      { key: "extra.type", label: "Type", badge: true },
      {
        key: "promotionValue",
        label: "Value",
        badge: true,
        render: promotionValue,
        toneFor: (row) => (String((row.extra ?? {}).type ?? "") === "fixed" ? "indigo" : "emerald"),
      },
      { key: "extra.validFrom", label: "Starts", date: true },
      { key: "extra.validTo", label: "Ends", date: true },
    ],
    fields: [
      { key: "name", label: "Name", placeholder: "e.g. Happy Hour 20% pastry" },
      {
        key: "extra.type",
        label: "Discount type",
        kind: "select",
        options: ["percent", "fixed"],
      },
      {
        key: "extra.value",
        label: "Value",
        kind: "number",
        suffix: "%",
        placeholder: "e.g. 10",
      },
      { key: "extra.minOrder", label: "Minimum order", kind: "number", suffix: "₦" },
      { key: "extra.maxDiscount", label: "Maximum discount off", kind: "number", suffix: "₦" },
      { key: "extra.appliesTo", label: "Applies to", kind: "select", options: ["all", "select-items"] },
      { key: "extra.validFrom", label: "Starts", kind: "date" },
      { key: "extra.validTo", label: "Ends", kind: "date" },
      { key: "note", label: "Rules shown at the till", kind: "textarea" },
    ],
    status: validStatus,
    insight: (rows) => {
      const now = new Date().toISOString().slice(0, 10);
      const liveRows = rows.filter((row) => {
        if (!row.active) return false;
        const to = String((row.extra ?? {}).validTo ?? "");
        return !to || to >= now;
      }).length;
      return { label: "Live now", value: String(liveRows), hint: "running promotions" };
    },
  },
  "expense-account": {
    directory: "expense-accounts",
    kicker: "Setup · Expense Account",
    title: "Expense Account",
    copy: "Accounts expenses are booked against, e.g. Diesel, Rent, Logistics.",
    singular: "expense account",
    columns: [{ key: "note", label: "Description" }],
    fields: [{ key: "note", label: "Description", kind: "textarea" }],
  },
};