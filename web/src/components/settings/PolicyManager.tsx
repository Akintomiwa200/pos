"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  asBool,
  asNum,
  asStr,
  deletePolicy,
  listPolicies,
  savePolicy,
  type PolicyKind,
  type PolicyRecord,
} from "@/lib/hq-policies";
import { ManagerSkeleton } from "@/components/Skeleton";
import { Card, EmptyRow, PageHeader, TableShell } from "@/components/console/Chrome";

export type PolicyFieldKind = "text" | "number" | "select" | "textarea" | "toggle" | "date";

export type PolicyField = {
  key: string;
  label: string;
  kind?: PolicyFieldKind;
  options?: string[];
  placeholder?: string;
  hint?: string;
};

export type PolicyColumn = {
  key: string;
  label: string;
  render?: (row: PolicyRecord) => string;
  badge?: boolean;
  tone?: (value: string) => string;
};

const inputCls =
  "w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary";
const labelCls = "text-xs font-medium uppercase tracking-wide text-pos-ink-muted";

function money(value: unknown) {
  const n = asNum(value);
  return `₦${n.toLocaleString()}`;
}

function formatValue(row: PolicyRecord, column: PolicyColumn) {
  if (column.render) return column.render(row);
  const raw = row[column.key];
  if (column.key.endsWith("Minor")) return money(raw);
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (column.key.includes("At") || column.key.includes("From") || column.key === "date") {
    const s = asStr(raw);
    if (!s) return "—";
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return s;
    return parsed.toLocaleDateString();
  }
  return asStr(raw) || "—";
}

export function PolicyManager({
  kicker,
  title,
  copy,
  kind,
  columns,
  fields,
  blank,
  createLabel = "Add",
}: {
  kicker: string;
  title: string;
  copy: string;
  kind: PolicyKind;
  columns: PolicyColumn[];
  fields: PolicyField[];
  blank: Record<string, string | boolean>;
  createLabel?: string;
}) {
  const [rows, setRows] = useState<PolicyRecord[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({ ...blank });
  const [busy, setBusy] = useState(false);

  async function load() {
    listPolicies(kind)
      .then(setRows)
      .catch((err) => {
        toast.error(err, "Could not load settings");
        setRows([]);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function set(field: PolicyField, value: string | boolean) {
    setDraft((prev) => ({ ...prev, [field.key]: value }));
  }

  async function save() {
    if (!draft.name || !asStr(draft.name).trim()) {
      toast.error("A name is required");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { name: asStr(draft.name).trim() };
      for (const field of fields) {
        if (field.key === "name") continue;
        if (field.kind === "toggle") {
          body[field.key] = asBool(draft[field.key]);
        } else if (field.kind === "number") {
          body[field.key] = asNum(draft[field.key]);
        } else {
          body[field.key] = asStr(draft[field.key]).trim();
        }
      }
      const saved = await savePolicy(kind, body);
      setRows((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setDraft({ ...blank });
      toast.success("Saved");
    } catch (err) {
      toast.error(err, "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deletePolicy(kind, id);
      setRows((prev) => (prev ?? []).filter((row) => row.id !== id));
      toast.success("Removed");
    } catch (err) {
      toast.error(err, "Could not remove");
    }
  }

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <PageHeader kicker={kicker} title={title} copy={copy} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Records</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Active</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">
            {rows.filter((row) => asBool(row.active) !== false).length}
          </p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Section</p>
          <p className="mt-2 truncate text-[15px] font-semibold leading-snug text-pos-ink-faint">
            {kind.replace(/([A-Z])/g, " $1").toLowerCase()}
          </p>
        </div>
      </div>

      <Card title={createLabel} subtitle="Add a new record to this settings section.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <label key={field.key} className={field.kind === "toggle" || field.key === "name" ? "sm:col-span-1" : ""}>
              <span className={labelCls}>{field.label}</span>
              {field.kind === "textarea" ? (
                <textarea
                  className={`${inputCls} mt-1 min-h-[70px] resize-y`}
                  value={asStr(draft[field.key])}
                  placeholder={field.placeholder}
                  onChange={(event) => set(field, event.target.value)}
                />
              ) : field.kind === "select" ? (
                <select
                  className={`${inputCls} mt-1`}
                  value={asStr(draft[field.key])}
                  onChange={(event) => set(field, event.target.value)}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.kind === "toggle" ? (
                <span className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-pos-border bg-pos-surface px-3 py-2.5 text-sm text-pos-ink">
                  {field.label}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={asBool(draft[field.key])}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      asBool(draft[field.key]) ? "bg-pos-primary" : "bg-pos-border"
                    }`}
                    onClick={() => set(field, !asBool(draft[field.key]))}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-pos-surface transition ${
                        asBool(draft[field.key]) ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </span>
              ) : (
                <input
                  className={`${inputCls} mt-1`}
                  type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
                  value={asStr(draft[field.key])}
                  placeholder={field.placeholder}
                  min={field.kind === "number" ? "0" : undefined}
                  onChange={(event) => set(field, event.target.value)}
                />
              )}
            </label>
          ))}
          <div className="flex items-end">
            <button
              onClick={save}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus size={14} /> {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <TableShell columns={[...columns.map((column) => column.label), ""]} minWidth={720}>
          {rows.length === 0 ? (
            <EmptyRow colSpan={columns.length + 1} message="Nothing recorded yet." />
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-pos-border/60">
                {columns.map((column) => {
                  const value = formatValue(row, column);
                  const tone = column.tone?.(value);
                  return (
                    <td key={column.key} className="px-4 py-3">
                      {column.badge ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                            tone === "emerald"
                              ? "bg-pos-success/10 text-pos-success"
                              : tone === "rose"
                                ? "bg-pos-danger/10 text-pos-danger"
                                : "bg-pos-surface-muted text-pos-ink-faint"
                          }`}
                        >
                          {value}
                        </span>
                      ) : (
                        <span className="text-pos-ink">{value}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(row.id)}
                    className="text-pos-ink-faint hover:text-pos-danger"
                    aria-label="Delete record"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    </div>
  );
}