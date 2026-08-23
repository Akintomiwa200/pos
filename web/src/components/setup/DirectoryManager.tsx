"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteDirectory,
  listDirectory,
  saveDirectory,
  type DirectoryName,
  type DirectoryRecord,
} from "@/lib/hq-directory";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  ToggleField,
  fieldClass,
} from "./SetupChrome";

export type DirectoryField = {
  key: "phone" | "email" | "address" | "note";
  label: string;
};

export type DirectoryConfig = {
  directory: DirectoryName;
  kicker: string;
  title: string;
  copy: string;
  singular: string;
  columns: Array<{ key: "phone" | "email" | "address" | "note"; label: string }>;
  fields: DirectoryField[];
};

const blank = (): Partial<DirectoryRecord> => ({ name: "", active: true });

export function DirectoryManager({ config }: { config: DirectoryConfig }) {
  const [rows, setRows] = useState<DirectoryRecord[]>([]);
  const [draft, setDraft] = useState<Partial<DirectoryRecord>>(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listDirectory(config.directory));
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load records");
      setReady(true);
    });
  }, [config.directory]);

  if (!ready) return <ManagerSkeleton variant="list" />;

  const columns = ["Name", ...config.columns.map((column) => column.label), "Status"];

  return (
    <div>
      <SetupHeader
        kicker={config.kicker}
        title={config.title}
        copy={config.copy}
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank());
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
      <DataTable columns={columns}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={columns.length}>
              No {config.title.toLowerCase()} yet.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
              onClick={() => {
                setDraft(row);
                setOpen(true);
              }}
            >
              <td className="px-4 py-3 font-medium">{row.name}</td>
              {config.columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-pos-ink-muted">
                  {row[column.key] || "—"}
                </td>
              ))}
              <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
            </tr>
          ))
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
                    await load();
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
                  await saveDirectory(config.directory, draft);
                  await load();
                  setOpen(false);
                  toast.success("Saved.");
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
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name ?? ""}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        {config.fields.map((field) => (
          <Field key={field.key} label={field.label}>
            {field.key === "note" || field.key === "address" ? (
              <textarea
                rows={2}
                className={fieldClass}
                value={draft[field.key] ?? ""}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              />
            ) : (
              <input
                className={fieldClass}
                value={draft[field.key] ?? ""}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              />
            )}
          </Field>
        ))}
        <ToggleField
          label="Active"
          checked={draft.active ?? true}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}

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
      { key: "note", label: "Credit terms / note" },
    ],
  },
  vendor: {
    directory: "vendors",
    kicker: "Setup · Vendor",
    title: "Vendor",
    copy: "Suppliers you raise purchase orders and record purchase invoices against.",
    singular: "vendor",
    columns: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "note", label: "Note" },
    ],
  },
  "sales-representative": {
    directory: "sales-reps",
    kicker: "Setup · Sales Representative",
    title: "Sales Representative",
    copy: "Reps who can be attached to sales for commission and leaderboard tracking.",
    singular: "sales rep",
    columns: [{ key: "phone", label: "Phone" }],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "note", label: "Note" },
    ],
  },
  staff: {
    directory: "staff",
    kicker: "Setup · Staff",
    title: "Staff",
    copy: "Back-office staff records for payroll references and responsibility tracking.",
    singular: "staff member",
    columns: [
      { key: "phone", label: "Phone" },
      { key: "note", label: "Role note" },
    ],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "note", label: "Role note" },
    ],
  },
  manufacturer: {
    directory: "manufacturers",
    kicker: "Setup · Manufacturer",
    title: "Manufacturer",
    copy: "Brands and manufacturers used when setting up catalog items.",
    singular: "manufacturer",
    columns: [{ key: "note", label: "Note" }],
    fields: [{ key: "note", label: "Note" }],
  },
  "payment-method": {
    directory: "payment-methods",
    kicker: "Setup · Payment Method",
    title: "Payment Method",
    copy: "Tenders cashiers can select at checkout, e.g. Cash, Transfer, Card.",
    singular: "payment method",
    columns: [{ key: "note", label: "Instructions" }],
    fields: [{ key: "note", label: "Instructions" }],
  },
  "sales-promotion": {
    directory: "promotions",
    kicker: "Setup · Sales Promotion",
    title: "Sales Promotion",
    copy: "Discount campaigns your cashiers can apply at the till.",
    singular: "promotion",
    columns: [{ key: "note", label: "Rules" }],
    fields: [{ key: "note", label: "Rules" }],
  },
  "expense-account": {
    directory: "expense-accounts",
    kicker: "Setup · Expense Account",
    title: "Expense Account",
    copy: "Accounts expenses are booked against, e.g. Diesel, Rent, Logistics.",
    singular: "expense account",
    columns: [{ key: "note", label: "Description" }],
    fields: [{ key: "note", label: "Description" }],
  },
};
