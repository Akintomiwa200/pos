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
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

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
    <div>
      <SetupHeader
        kicker="Setup · Products"
        title={isComposite ? "Pack & cartons" : "Units of measure"}
        copy={
          isComposite
            ? "Carton, bag, packet, pack and other multi-piece units. Set how many pieces are in each pack on the product."
            : "Single items, weight (kg) and volume (L). For cartons and packs, use Pack & Cartons."
        }
        action={
          <PrimaryButton onClick={openNew}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              {isComposite ? "New pack unit" : "New unit"}
            </span>
          </PrimaryButton>
        }
      />
      <DataTable
        columns={
          isComposite
            ? ["Name", "Code", "Products", "Status"]
            : ["Name", "Code", "Type", "Products", "Status"]
        }
      >
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={isComposite ? 4 : 5} className="px-4 py-8 text-center text-pos-ink-faint">
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
                className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
                onClick={() => openEdit(row)}
              >
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 font-mono text-sm text-pos-ink-muted">{code}</td>
                {!isComposite ? (
                  <td className="px-4 py-3 text-pos-ink-muted">{unitKindLabel(kind)}</td>
                ) : null}
                <td className="px-4 py-3">{productCount(usage, "units", code)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.active
                        ? "bg-pos-primary/10 text-pos-primary"
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
        title={draft.id ? (isComposite ? "Edit pack unit" : "Edit unit") : isComposite ? "New pack unit" : "New unit"}
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
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
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
