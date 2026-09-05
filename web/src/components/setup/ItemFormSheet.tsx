"use client";

import { useEffect, useMemo, type FormEvent, type ReactNode } from "react";
import { Barcode, Boxes, Package, Tag, Wallet, X } from "lucide-react";
import { marginPercent } from "@/lib/catalog";
import { naira } from "@/lib/hq-ops";
import { currencySymbol, useOrgLocale } from "@/lib/org-locale";
import {
  inferUnitKind,
  formatPricePer,
  unitKindLabel,
  type UnitKind,
} from "@/lib/units";
import {
  subcategoryParentId,
  subcategoryParentName,
  unitCode,
  unitKindFromRecord,
  type TaxonomyRecord,
} from "@/lib/hq-taxonomy";
import { ProductImageField } from "./ProductImageField";
import { fieldClass } from "./SetupChrome";

export type ItemDraft = {
  id?: string;
  name: string;
  category: string;
  subcategory: string;
  sku: string;
  barcode: string;
  batchNumber: string;
  brand: string;
  cost: string;
  price: string;
  pricingMode: "direct" | "margin";
  marginInput: string;
  onHand: string;
  reorderLevel: string;
  unit: string;
  packSize: string;
  description: string;
  active: boolean;
  expiresAt: string;
  image?: string;
};

type Props = {
  open: boolean;
  draft: ItemDraft;
  busy: boolean;
  categories: TaxonomyRecord[];
  subcategories: TaxonomyRecord[];
  units: TaxonomyRecord[];
  brands?: TaxonomyRecord[];
  onClose: () => void;
  onChange: (patch: Partial<ItemDraft>) => void;
  onImageChange: (file: File | null) => void;
  onSubmit: () => void;
};

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-pos-ink">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-pos-ink-faint">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function InputLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-pos-ink-muted">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-pos-ink-faint">{hint}</span> : null}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function ItemFormSheet({
  open,
  draft,
  busy,
  categories,
  subcategories,
  units,
  brands = [],
  onClose,
  onChange,
  onImageChange,
  onSubmit,
}: Props) {
  const { currency } = useOrgLocale();
  const mark = currencySymbol(currency);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const cost = useMemo(
    () => Math.round((parseFloat(draft.cost) || 0) * 100),
    [draft.cost],
  );

  const sell = useMemo(
    () => Math.round((parseFloat(draft.price) || 0) * 100),
    [draft.price],
  );

  const margin = useMemo(() => {
    if (draft.pricingMode === "margin") {
      const input = parseFloat(draft.marginInput);
      if (Number.isFinite(input)) return Math.max(-9999, Math.min(100, input));
    }
    return marginPercent(cost, sell);
  }, [draft.pricingMode, draft.marginInput, cost, sell]);

  const effectiveSell = useMemo(() => {
    if (draft.pricingMode === "margin") {
      const pct = Number.isFinite(parseFloat(draft.marginInput))
        ? Math.max(-9999, Math.min(100, parseFloat(draft.marginInput)))
        : 0;
      return pct >= 100 ? 0 : Math.round(cost / (1 - pct / 100));
    }
    return sell;
  }, [draft.pricingMode, draft.marginInput, cost, sell]);

  const activeCategories = useMemo(
    () => categories.filter((row) => row.active),
    [categories],
  );
  const selectedCategory = activeCategories.find((row) => row.name === draft.category);
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategory) return subcategories.filter((row) => row.active);
    return subcategories.filter(
      (row) =>
        row.active &&
        (subcategoryParentId(row) === selectedCategory.id ||
          subcategoryParentName(row) === selectedCategory.name),
    );
  }, [subcategories, selectedCategory]);
  const activeUnits = useMemo(() => units.filter((row) => row.active), [units]);

  const selectedUnit = useMemo(
    () => activeUnits.find((row) => unitCode(row) === draft.unit),
    [activeUnits, draft.unit],
  );

  const selectedUnitKind = useMemo((): UnitKind => {
    if (!selectedUnit) return inferUnitKind(draft.unit);
    const fromRecord = unitKindFromRecord(selectedUnit);
    return (fromRecord as UnitKind | null) ?? inferUnitKind(unitCode(selectedUnit));
  }, [selectedUnit, draft.unit]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  const isEdit = Boolean(draft.id);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl flex-col bg-pos-bg text-pos-ink shadow-pos-md">
        <header className="flex shrink-0 items-start justify-between gap-4 bg-pos-surface px-6 py-5 shadow-pos-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              {isEdit ? "Edit product" : "New product"}
            </p>
            <h2 className="mt-2 text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
              {isEdit ? draft.name || "Untitled item" : "Add to catalog"}
            </h2>
            <p className="mt-2 text-sm text-pos-ink-muted">
              Cost, selling price, batch, and stock sync live to tills and reports.
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink hover:bg-pos-border/60"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Section icon={<Package size={18} />} title="Photo">
              <ProductImageField
                itemId={(draft.id ?? draft.sku) || undefined}
                imageUrl={draft.image}
                disabled={busy}
                onChange={onImageChange}
              />
            </Section>

            <Section icon={<Tag size={18} />} title="Product details">
              <div className="space-y-4">
                <InputLabel label="Name">
                  <input
                    required
                    className={fieldClass}
                    placeholder="e.g. Coca-Cola 50cl"
                    value={draft.name}
                    disabled={busy}
                    onChange={(event) => onChange({ name: event.target.value })}
                  />
                </InputLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputLabel label="Category">
                    <select
                      required
                      className={fieldClass}
                      value={draft.category}
                      disabled={busy}
                      onChange={(event) =>
                        onChange({ category: event.target.value, subcategory: "" })
                      }
                    >
                      <option value="">Select category…</option>
                      {activeCategories.map((row) => (
                        <option key={row.id} value={row.name}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </InputLabel>
                  <InputLabel label="Subcategory" hint="Optional — manage under Subcategories.">
                    <select
                      className={fieldClass}
                      value={draft.subcategory}
                      disabled={busy || !draft.category}
                      onChange={(event) => onChange({ subcategory: event.target.value })}
                    >
                      <option value="">None</option>
                      {filteredSubcategories.map((row) => (
                        <option key={row.id} value={row.name}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </InputLabel>
                </div>
                <InputLabel label="Brand" hint="Optional — manage under Brands.">
                  <select
                    className={fieldClass}
                    value={draft.brand}
                    disabled={busy}
                    onChange={(event) => onChange({ brand: event.target.value })}
                  >
                    <option value="">None</option>
                    {brands
                      .filter((row) => row.active !== false)
                      .map((row) => (
                        <option key={row.id} value={row.name}>
                          {row.name}
                        </option>
                      ))}
                  </select>
                </InputLabel>
                <InputLabel label="Unit" hint={unitKindLabel(selectedUnitKind)}>
                  <select
                    className={fieldClass}
                    value={draft.unit}
                    disabled={busy}
                    onChange={(event) => {
                      const code = event.target.value;
                      const row = activeUnits.find((unit) => unitCode(unit) === code);
                      const kind =
                        (row && (unitKindFromRecord(row) as UnitKind | null)) ??
                        inferUnitKind(code);
                      onChange({
                        unit: code,
                        packSize: kind === "composite" ? draft.packSize || "12" : "1",
                      });
                    }}
                  >
                    {activeUnits.map((row) => {
                      const code = unitCode(row);
                      const kind =
                        (unitKindFromRecord(row) as UnitKind | null) ?? inferUnitKind(code);
                      return (
                        <option key={row.id} value={code}>
                          {row.name} ({code}) · {unitKindLabel(kind)}
                        </option>
                      );
                    })}
                  </select>
                </InputLabel>
                {selectedUnitKind === "composite" ? (
                  <InputLabel
                    label="Pieces per pack"
                    hint="How many single items are inside one pack/carton/bag."
                  >
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={fieldClass}
                      value={draft.packSize}
                      disabled={busy}
                      onChange={(event) => onChange({ packSize: event.target.value })}
                    />
                  </InputLabel>
                ) : null}
                <InputLabel label="Description" hint="Optional notes for staff.">
                  <textarea
                    className={`${fieldClass} min-h-[72px] resize-y`}
                    placeholder="Allergens, size, supplier notes…"
                    value={draft.description}
                    disabled={busy}
                    onChange={(event) => onChange({ description: event.target.value })}
                  />
                </InputLabel>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2.5 text-sm">
                  <span className="font-medium text-pos-ink">Active on tills</span>
                  <input
                    type="checkbox"
                    className="accent-pos-primary"
                    checked={draft.active}
                    disabled={busy}
                    onChange={(event) => onChange({ active: event.target.checked })}
                  />
                </label>
              </div>
            </Section>

            <Section
              icon={<Barcode size={18} />}
              title="Identifiers & batch"
              hint={
                selectedUnitKind === "composite"
                  ? isEdit
                    ? "Pack barcode is the code on the outer carton/pack. Regenerate under Pack & Cartons if needed."
                    : "Pack barcode is the outer pack code — leave blank to auto-generate. Pieces per pack is required."
                  : isEdit
                    ? "SKU and barcode are fixed after creation. Batch can be updated per delivery."
                    : "Leave SKU and barcode blank — both are auto-generated when you save."
              }
            >
              {isEdit ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">SKU</p>
                    <p className="mt-1 font-mono text-sm text-pos-ink">{draft.sku || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                      {selectedUnitKind === "composite" ? "Pack barcode" : "Barcode"}
                    </p>
                    <p className="mt-1 font-mono text-sm text-pos-ink">{draft.barcode || "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputLabel label="SKU" hint="Auto-generated if empty">
                    <input
                      className={fieldClass}
                      placeholder="Auto"
                      value={draft.sku}
                      disabled={busy}
                      onChange={(event) => onChange({ sku: event.target.value })}
                    />
                  </InputLabel>
                  <InputLabel
                    label={selectedUnitKind === "composite" ? "Pack barcode" : "Barcode"}
                    hint={
                      selectedUnitKind === "composite"
                        ? "Outer pack/carton code — auto if empty"
                        : "Auto-generated if empty"
                    }
                  >
                    <input
                      className={fieldClass}
                      placeholder="Auto"
                      value={draft.barcode}
                      disabled={busy}
                      onChange={(event) => onChange({ barcode: event.target.value })}
                    />
                  </InputLabel>
                </div>
              )}
              <div className="mt-4">
                <InputLabel label="Batch / lot number" hint="Track deliveries and expiry batches.">
                  <input
                    className={fieldClass}
                    placeholder="e.g. LOT-2026-0312"
                    value={draft.batchNumber}
                    disabled={busy}
                    onChange={(event) => onChange({ batchNumber: event.target.value })}
                  />
                </InputLabel>
              </div>
            </Section>

            <Section icon={<Wallet size={18} />} title="Pricing">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChange({ pricingMode: "direct" })}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                    draft.pricingMode === "direct"
                      ? "bg-pos-primary text-white shadow-pos-primary"
                      : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  Set selling price directly
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChange({ pricingMode: "margin" })}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                    draft.pricingMode === "margin"
                      ? "bg-pos-primary text-white shadow-pos-primary"
                      : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  Set by margin
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InputLabel
                  label={`Cost price (${mark})`}
                  hint={`What you pay ${formatPricePer(draft.unit, selectedUnit?.name)}.`}
                >
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={fieldClass}
                    placeholder="0.00"
                    value={draft.cost}
                    disabled={busy}
                    onChange={(event) => onChange({ cost: event.target.value })}
                  />
                </InputLabel>

                {draft.pricingMode === "direct" ? (
                  <InputLabel
                    label={`Selling price (${mark})`}
                    hint={`What customers pay ${formatPricePer(draft.unit, selectedUnit?.name)}.`}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className={fieldClass}
                      placeholder="0.00"
                      value={draft.price}
                      disabled={busy}
                      onChange={(event) => onChange({ price: event.target.value })}
                    />
                  </InputLabel>
                ) : (
                  <InputLabel
                    label="Margin (%)"
                    hint="Selling price is derived from cost."
                  >
                    <input
                      type="number"
                      step="0.1"
                      min={-999}
                      max={99.9}
                      className={fieldClass}
                      placeholder="e.g. 30"
                      value={draft.marginInput}
                      disabled={busy}
                      onChange={(event) => onChange({ marginInput: event.target.value })}
                    />
                  </InputLabel>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-pos-border bg-pos-surface-muted px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-pos-ink-muted">Gross margin</span>
                  <span className="font-semibold text-pos-ink">{margin}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-pos-ink-faint">
                  <span>
                    {draft.pricingMode === "margin" ? "Computed selling price" : "Markup per unit"}
                  </span>
                  <span>{naira(effectiveSell)}</span>
                </div>
                {draft.pricingMode === "margin" ? (
                  <p className="mt-2 text-[11px] leading-snug text-pos-ink-faint">
                    Selling price is computed as Cost ÷ (1 − margin). Change the cost or margin to
                    recalculate.
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] leading-snug text-pos-ink-faint">
                    Selling price is entered independently of cost.
                  </p>
                )}
              </div>
            </Section>

            <Section icon={<Boxes size={18} />} title="Inventory">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputLabel label="Quantity on hand">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={fieldClass}
                    placeholder="0"
                    value={draft.onHand}
                    disabled={busy}
                    onChange={(event) => onChange({ onHand: event.target.value })}
                  />
                </InputLabel>
                <InputLabel label="Reorder level" hint="Low-stock alert threshold.">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={fieldClass}
                    placeholder="5"
                    value={draft.reorderLevel}
                    disabled={busy}
                    onChange={(event) => onChange({ reorderLevel: event.target.value })}
                  />
                </InputLabel>
                <div className="sm:col-span-2">
                  <InputLabel label="Expiry date" hint="Optional — perishables and batch tracking.">
                    <input
                      type="date"
                      className={fieldClass}
                      value={draft.expiresAt}
                      disabled={busy}
                      onChange={(event) => onChange({ expiresAt: event.target.value })}
                    />
                  </InputLabel>
                </div>
              </div>
            </Section>
          </div>

          <footer className="shrink-0 bg-pos-surface px-6 py-4 shadow-[0_-8px_24px_rgba(28,28,30,0.04)]">
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="flex-1 rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm font-semibold text-pos-ink hover:bg-pos-border/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-[1.4] rounded-full bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white shadow-pos-primary hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Saving…" : isEdit ? "Save changes" : "Create item"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
