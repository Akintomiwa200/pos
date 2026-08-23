"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { nairaInputFromMinor, parseNairaInput, suggestPackBarcode } from "@/lib/catalog";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { importCatalogRows } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { formatStock, inferUnitKind, unitKindLabel } from "@/lib/units";
import {
  listCategories,
  listUnits,
  unitCode,
  unitKindFromRecord,
  type TaxonomyRecord,
} from "@/lib/hq-taxonomy";
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
  secondaryButtonClass,
} from "./SetupChrome";

type PackDraft = {
  id?: string;
  name: string;
  category: string;
  unit: string;
  packSize: string;
  barcode: string;
  sku: string;
  cost: string;
  price: string;
  onHand: string;
  active: boolean;
};

const blank = (unit = "pack"): PackDraft => ({
  name: "",
  category: "",
  unit,
  packSize: "12",
  barcode: "",
  sku: "",
  cost: "",
  price: "",
  onHand: "0",
  active: true,
});

function isCompositeUnit(row: TaxonomyRecord) {
  const code = unitCode(row);
  const kind = (unitKindFromRecord(row) as string | null) ?? inferUnitKind(code);
  return kind === "composite";
}

function isPackProduct(item: HqCatalogItem, compositeCodes: Set<string>) {
  if (compositeCodes.has((item.unit || "").toLowerCase())) return true;
  return inferUnitKind(item.unit) === "composite";
}

export function PacksManager() {
  const [items, setItems] = useState<HqCatalogItem[]>([]);
  const [units, setUnits] = useState<TaxonomyRecord[]>([]);
  const [categories, setCategories] = useState<TaxonomyRecord[]>([]);
  const [draft, setDraft] = useState<PackDraft>(blank());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    const [catalog, unitRows, cats] = await Promise.all([
      listCatalog(),
      listUnits(),
      listCategories(),
    ]);
    setItems(catalog);
    setUnits(unitRows);
    setCategories(cats);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load packs.");
      setReady(true);
    });
  }, []);

  const packUnits = useMemo(
    () => units.filter((row) => row.active !== false && isCompositeUnit(row)),
    [units],
  );

  const compositeCodes = useMemo(
    () => new Set(packUnits.map((row) => unitCode(row).toLowerCase())),
    [packUnits],
  );

  const packs = useMemo(
    () => items.filter((item) => isPackProduct(item, compositeCodes)),
    [items, compositeCodes],
  );

  const missingBarcode = packs.filter((row) => !row.barcode?.trim());

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...packs].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.sku, row.barcode, row.category, row.unit, row.brand ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [packs, search]);

  function openNew() {
    const defaultUnit = packUnits[0] ? unitCode(packUnits[0]) : "pack";
    setDraft(blank(defaultUnit));
    setOpen(true);
  }

  function openEdit(item: HqCatalogItem) {
    setDraft({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit || "pack",
      packSize: String(Math.max(2, item.packSize || 12)),
      barcode: item.barcode || "",
      sku: item.sku || "",
      cost: nairaInputFromMinor(item.costMinor ?? 0),
      price: nairaInputFromMinor(item.priceMinor),
      onHand: String(item.onHand),
      active: item.active !== false,
    });
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter the pack product name.");
      return;
    }
    if (!draft.category.trim()) {
      toast.error("Choose a category.");
      return;
    }
    const packSize = Math.max(2, Math.round(parseFloat(draft.packSize) || 12));
    const unitRow = packUnits.find((row) => unitCode(row) === draft.unit) ?? packUnits[0];
    const unit = unitRow ? unitCode(unitRow) : draft.unit || "pack";

    let barcode = draft.barcode.trim();
    if (!barcode) {
      barcode = suggestPackBarcode(items.map((row) => row.barcode));
    }

    setBusy(true);
    try {
      await importCatalogRows([
        {
          id: draft.id,
          name: draft.name.trim(),
          category: draft.category.trim(),
          sku: draft.sku.trim() || undefined,
          barcode,
          costMinor: parseNairaInput(draft.cost),
          priceMinor: parseNairaInput(draft.price),
          onHand: Math.max(0, Math.round(parseFloat(draft.onHand) || 0)),
          unit,
          unitLabel: unitRow?.name || unit,
          packSize,
          active: draft.active,
        },
      ]);
      await load();
      setOpen(false);
      toast.success(
        draft.id
          ? "Pack updated."
          : `Pack created · barcode ${barcode} · ${packSize} pieces each.`,
      );
    } catch (err) {
      toast.error(err, "Could not save pack.");
    } finally {
      setBusy(false);
    }
  }

  async function generateMissingBarcodes() {
    if (!missingBarcode.length) {
      toast.success("Every pack already has a barcode.");
      return;
    }
    setBusy(true);
    try {
      const used = items.map((row) => row.barcode);
      const rows = missingBarcode.map((item) => {
        const code = suggestPackBarcode(used);
        used.push(code);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          barcode: code,
          packSize: Math.max(2, item.packSize || 12),
          unit: item.unit,
          unitLabel: item.unitLabel,
        };
      });
      await importCatalogRows(rows);
      await load();
      toast.success(`Generated barcodes for ${rows.length} pack${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err, "Could not generate barcodes.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Main Menu · Products"
        title="Pack & Cartons"
        copy="Products sold as a pack, carton, bag or case — not as single pieces. Example: Chivita sold as a pack of 12. Each pack can have its own barcode; blank ones are auto-generated."
        action={
          <div className="flex flex-wrap gap-2">
            {missingBarcode.length ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={() => void generateMissingBarcodes()}
              >
                <RefreshCw size={16} />
                Generate {missingBarcode.length} barcode
                {missingBarcode.length === 1 ? "" : "s"}
              </button>
            ) : null}
            <PrimaryButton onClick={openNew}>
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New pack product
              </span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Pack products" value={String(packs.length)} hint="Composite sell units" />
        <SetupStat
          label="Pieces represented"
          value={String(packs.reduce((sum, row) => sum + row.onHand * Math.max(1, row.packSize || 1), 0))}
          tone="accent"
        />
        <SetupStat label="Missing barcodes" value={String(missingBarcode.length)} />
        <SetupStat label="Pack unit types" value={String(packUnits.length)} hint="Pack · carton · bag…" />
      </div>

      {!packUnits.length ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No composite units yet. Add Pack / Carton under Units with type “Pack / carton / bag”, then
          create pack products here.
        </p>
      ) : null}

      <DataTable
        columns={["Product", "Sold as", "Pieces / pack", "Pack barcode", "Price / pack", "Stock", "Status"]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search packs, barcodes, brands…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-pos-ink-faint" colSpan={7}>
              No pack products yet. Create one for items sold by the dozen, carton, or multi-pack —
              e.g. Chivita × 12.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const size = Math.max(1, row.packSize || 1);
            const unitRow = packUnits.find((u) => unitCode(u) === row.unit);
            const label = row.unitLabel || unitRow?.name || row.unit;
            return (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
                onClick={() => openEdit(row)}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-[12px] text-pos-ink-faint">{row.category}</p>
                </td>
                <td className="px-4 py-3 capitalize">{label}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{size}</td>
                <td className="px-4 py-3 font-mono text-[13px]">
                  {row.barcode?.trim() ? (
                    row.barcode
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Needs barcode
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{naira(row.priceMinor)}</td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {formatStock(row.onHand, row.unit, size, row.unitLabel, "composite")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      row.active !== false
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-pos-surface-muted text-pos-ink-muted"
                    }`}
                  >
                    {row.active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={draft.id ? "Edit pack product" : "New pack product"}
        subtitle="Sold as a composite unit (not single pieces). Set how many pieces are inside, and the barcode printed on the outer pack."
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton className="w-full" disabled={busy} onClick={() => void save()}>
            Save pack
          </PrimaryButton>
        }
      >
        <Field label="Product name">
          <input
            className={fieldClass}
            placeholder="e.g. Chivita Active 1L Pack"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Category">
          <select
            className={fieldClass}
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          >
            <option value="">Select category…</option>
            {categories
              .filter((row) => row.active !== false)
              .map((row) => (
                <option key={row.id} value={row.name}>
                  {row.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sold as">
            <select
              className={fieldClass}
              value={draft.unit}
              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
            >
              {packUnits.length === 0 ? (
                <option value="pack">Pack</option>
              ) : (
                packUnits.map((row) => (
                  <option key={row.id} value={unitCode(row)}>
                    {row.name} · {unitKindLabel("composite")}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field label="Pieces in each pack">
            <input
              type="number"
              min={2}
              step={1}
              className={fieldClass}
              value={draft.packSize}
              onChange={(event) => setDraft({ ...draft, packSize: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Pack barcode">
          <div className="flex gap-2">
            <input
              className={`${fieldClass} font-mono`}
              placeholder="Leave blank to auto-generate"
              value={draft.barcode}
              onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
            />
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() =>
                setDraft({
                  ...draft,
                  barcode: suggestPackBarcode(items.map((row) => row.barcode)),
                })
              }
            >
              Generate
            </button>
          </div>
          <p className="mt-1.5 text-[12px] text-pos-ink-faint">
            Outer pack/carton code scanned at the till. Single bottles keep a different product if you
            also sell them loose.
          </p>
        </Field>
        <Field label="SKU (optional)">
          <input
            className={fieldClass}
            placeholder="Auto if blank"
            value={draft.sku}
            onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cost per pack (₦)">
            <input
              className={fieldClass}
              value={draft.cost}
              onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
            />
          </Field>
          <Field label="Sell price per pack (₦)">
            <input
              className={fieldClass}
              value={draft.price}
              onChange={(event) => setDraft({ ...draft, price: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Packs on hand">
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={draft.onHand}
            onChange={(event) => setDraft({ ...draft, onHand: event.target.value })}
          />
        </Field>
        {Number(draft.packSize) >= 2 && Number(draft.onHand) >= 0 ? (
          <p className="mb-3 text-sm text-pos-ink-muted">
            That is{" "}
            <span className="font-semibold text-pos-ink">
              {Math.round(Number(draft.onHand) || 0) * Math.max(2, Math.round(Number(draft.packSize) || 12))}{" "}
              pieces
            </span>{" "}
            total.
          </p>
        ) : null}
        <ToggleField
          label="Active on tills"
          checked={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}
