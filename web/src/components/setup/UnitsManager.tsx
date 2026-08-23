"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { inferUnitKind, unitKindLabel, type UnitKind } from "@/lib/units";
import {
  deleteUnit,
  getTaxonomyUsage,
  listUnits,
  productCount,
  renameTaxonomy,
  saveUnit,
  unitCode,
  unitKindFromRecord,
  type TaxonomyRecord,
  type TaxonomyUsage,
} from "@/lib/hq-taxonomy";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, ToggleField, fieldClass } from "./SetupChrome";

const KINDS: UnitKind[] = ["count", "weight", "volume", "composite"];

type Draft = { id?: string; name: string; code: string; kind: UnitKind; active: boolean };

const blank: Draft = { name: "", code: "", kind: "count", active: true };
const compositeBlank: Draft = { name: "", code: "", kind: "composite", active: true };

export function UnitsManager({ kindFilter }: { kindFilter?: UnitKind }) {
  const [rows, setRows] = useState<TaxonomyRecord[]>([]);
  const [usage, setUsage] = useState<TaxonomyUsage | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [originalCode, setOriginalCode] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [units, taxonomy] = await Promise.all([listUnits(), getTaxonomyUsage()]);
    setRows(units);
    setUsage(taxonomy);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load units.");
      setReady(true);
    });
  }, []);

  const sorted = useMemo(
    () =>
      [...rows]
        .filter((row) => {
          const code = unitCode(row);
          const kind =
            (unitKindFromRecord(row) as UnitKind | null) ?? inferUnitKind(code);
          if (kindFilter) return kind === kindFilter;
          return kind !== "composite";
        })
        .sort(
          (a, b) =>
            productCount(usage, "units", unitCode(b)) -
              productCount(usage, "units", unitCode(a)) ||
            a.name.localeCompare(b.name),
        ),
    [rows, usage, kindFilter],
  );

  const isComposite = kindFilter === "composite";
  const newDraft = isComposite ? compositeBlank : blank;
  const activeCount = sorted.filter((row) => row.active).length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDraft(newDraft);
    setOriginalCode("");
    setOpen(true);
  }

  function openEdit(row: TaxonomyRecord) {
    const code = unitCode(row);
    const kind =
      (unitKindFromRecord(row) as UnitKind | null) ?? inferUnitKind(code);
    setDraft({ id: row.id, name: row.name, code, kind, active: row.active });
    setOriginalCode(code);
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter a unit name.");
      return;
    }
    const code = draft.code.trim().toLowerCase() || draft.name.trim().toLowerCase();
    setBusy(true);
    try {
      await saveUnit({
        id: draft.id,
        name: draft.name.trim(),
        note: code,
        active: draft.active,
        extra: { kind: isComposite ? "composite" : draft.kind },
      });
      if (draft.id && originalCode && originalCode !== code) {
        await renameTaxonomy("unit", originalCode, code);
      }
      await load();
      setOpen(false);
      toast.success(draft.id ? "Unit updated." : "Unit created.");
    } catch (err) {
      toast.error(err, "Could not save unit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            {isComposite ? "Pack & cartons" : "Units of measure"}
          </h1>
          <p className="mt-3 text-[14px] text-pos-ink-muted">
            {isComposite
              ? `Unit types for multi-piece selling (pack, carton, bag). Create the actual products — e.g. Chivita × 12 — under Pack & Cartons.`
              : `Count, weight and volume · ${sorted.length} units · ${activeCount} active`}
          </p>
        </div>
        <PrimaryButton onClick={openNew}>
          <Plus size={16} strokeWidth={2.2} />
          {isComposite ? "New pack unit" : "New unit"}
        </PrimaryButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">
            {isComposite ? "Pack units" : "Units"}
          </p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{sorted.length}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Active</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Type</p>
          <p className="mt-2 text-[16px] font-semibold leading-snug">
            {isComposite ? "Composite packs" : "Count · weight · volume"}
          </p>
        </div>
      </div>

      <DataTable
        columns={
          isComposite
            ? ["Name", "Code", "Products", "Status"]
            : ["Name", "Code", "Type", "Products", "Status"]
        }
      >
        {sorted.length === 0 ? (
          <tr>
            <td
              className="px-4 py-12 text-center text-pos-ink-faint"
              colSpan={isComposite ? 4 : 5}
            >
              {isComposite ? "No pack units yet." : "No units yet."}
            </td>
          </tr>
        ) : (
          sorted.map((row) => {
            const code = unitCode(row);
            const kind =
              (unitKindFromRecord(row) as UnitKind | null) ?? inferUnitKind(code);
            return (
              <tr
                key={row.id}
                className="cursor-pointer transition hover:bg-pos-surface-muted/70"
                onClick={() => openEdit(row)}
              >
                <td className="px-4 py-3.5 font-semibold text-pos-ink">{row.name}</td>
                <td className="px-4 py-3.5 font-mono text-[13px] text-pos-ink-muted">
                  {code}
                </td>
                {!isComposite ? (
                  <td className="px-4 py-3.5 text-pos-ink-muted">{unitKindLabel(kind)}</td>
                ) : null}
                <td className="px-4 py-3.5 tabular-nums text-pos-ink">
                  {productCount(usage, "units", code)}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      row.active
                        ? "bg-pos-success/10 text-pos-success"
                        : "bg-pos-surface-muted text-pos-ink-faint"
                    }`}
                  >
                    {row.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={
          draft.id
            ? isComposite
              ? "Edit pack unit"
              : "Edit unit"
            : isComposite
              ? "New pack unit"
              : "New unit"
        }
        subtitle={
          isComposite
            ? "Used when products are sold by carton, bag, packet or pack. Set pieces per pack on each product."
            : "For cartons and multi-piece packs, use Pack & Cartons instead."
        }
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm text-pos-ink"
                disabled={busy}
                onClick={async () => {
                  const count = productCount(usage, "units", draft.code);
                  if (count > 0) {
                    toast.error(`Reassign ${count} product(s) before deleting this unit.`);
                    return;
                  }
                  try {
                    await deleteUnit(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Unit deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete unit.");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton className="flex-1" disabled={busy} onClick={save}>
              Save unit
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Display name">
          <input
            className={fieldClass}
            value={draft.name}
            disabled={busy}
            placeholder="e.g. Carton"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Short code">
          <input
            className={fieldClass}
            value={draft.code}
            disabled={busy}
            placeholder={isComposite ? "e.g. ctn" : "e.g. kg"}
            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
          />
        </Field>
        {!isComposite ? (
          <Field label="Unit type">
            <select
              className={fieldClass}
              value={draft.kind}
              disabled={busy}
              onChange={(event) => setDraft({ ...draft, kind: event.target.value as UnitKind })}
            >
              {KINDS.filter((kind) => kind !== "composite").map((kind) => (
                <option key={kind} value={kind}>
                  {unitKindLabel(kind)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <ToggleField
          label="Active"
          checked={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}
