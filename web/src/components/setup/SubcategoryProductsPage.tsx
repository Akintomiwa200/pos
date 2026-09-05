"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { nairaInputFromMinor, parseNairaInput, resolveSellPriceMinor } from "@/lib/catalog";
import { deleteCatalogItem, type HqCatalogItem } from "@/lib/hq-api";
import { naira } from "@/lib/hq-ops";
import { productImageSrc } from "@/lib/product-image";
import { importCatalogRows } from "@/lib/hq-setup";
import { toast } from "@/lib/toast";
import { formatStock, inferUnitKind } from "@/lib/units";
import { useLiveCatalog } from "@/lib/live-catalog";
import {
  categorySlug,
  listCategories,
  listSubcategories,
  listUnits,
  subcategoryParentName,
  unitCode,
  type TaxonomyRecord,
} from "@/lib/hq-taxonomy";
import { listDirectory } from "@/lib/hq-directory";
import { ManagerSkeleton } from "../Skeleton";
import { PrimaryButton } from "./SetupChrome";
import { ItemFormSheet, type ItemDraft } from "./ItemFormSheet";

const blank: ItemDraft = {
  name: "",
  category: "",
  subcategory: "",
  sku: "",
  barcode: "",
  batchNumber: "",
  brand: "",
  cost: "",
  price: "",
  pricingMode: "direct",
  marginInput: "",
  onHand: "",
  reorderLevel: "5",
  unit: "each",
  packSize: "1",
  description: "",
  active: true,
  expiresAt: "",
};

function stockTone(item: HqCatalogItem): "ok" | "low" | "out" {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= (item.reorderLevel ?? 5)) return "low";
  return "ok";
}

function productStatus(item: HqCatalogItem): { label: string; className: string } {
  if (item.active === false) {
    return {
      label: "Inactive",
      className: "bg-red-500/10 text-red-600 dark:text-red-400",
    };
  }
  const tone = stockTone(item);
  if (tone === "out") {
    return {
      label: "Stock out",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    };
  }
  if (tone === "low") {
    return {
      label: "Low stock",
      className: "bg-pos-warning/15 text-pos-warning",
    };
  }
  return {
    label: "Active",
    className: "bg-pos-success/10 text-pos-success",
  };
}

function downloadCsv(filename: string, rows: HqCatalogItem[]) {
  const header = [
    "name",
    "category",
    "subcategory",
    "sku",
    "barcode",
    "batch",
    "brand",
    "cost",
    "price",
    "onHand",
    "reorderLevel",
    "unit",
    "unitLabel",
    "packSize",
    "expiresAt",
  ];
  const escapeCell = (value: unknown) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.category,
        row.subcategory ?? "",
        row.sku,
        row.barcode,
        row.batchNumber ?? "",
        row.brand ?? "",
        ((row.costMinor ?? 0) / 100).toFixed(2),
        ((row.priceMinor ?? 0) / 100).toFixed(2),
        row.onHand,
        row.reorderLevel ?? 0,
        row.unit,
        row.unitLabel ?? "",
        row.packSize ?? 1,
        row.expiresAt ? row.expiresAt.slice(0, 10) : "",
      ]
        .map(escapeCell)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toDraft(item: HqCatalogItem): ItemDraft {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? "",
    sku: item.sku,
    barcode: item.barcode,
    batchNumber: item.batchNumber ?? "",
    brand: item.brand ?? "",
    cost: nairaInputFromMinor(item.costMinor ?? 0),
    price: nairaInputFromMinor(item.priceMinor),
    pricingMode: "direct",
    marginInput: "",
    onHand: String(item.onHand),
    reorderLevel: String(item.reorderLevel ?? 5),
    unit: item.unit || "each",
    packSize: String(item.packSize ?? 1),
    description: item.description ?? "",
    active: item.active !== false,
    expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : "",
    image: item.image,
  };
}

export function SubcategoryProductsPage({ slug }: { slug: string }) {
  const { items: rows, removeItem, live } = useLiveCatalog();
  const [categories, setCategories] = useState<TaxonomyRecord[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyRecord[]>([]);
  const [units, setUnits] = useState<TaxonomyRecord[]>([]);
  const [brands, setBrands] = useState<TaxonomyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ItemDraft>(blank);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [parentName, setParentName] = useState("");

  useEffect(() => {
    Promise.all([listCategories(), listSubcategories(), listUnits(), listDirectory("manufacturers")])
      .then(([cats, subs, unitRows, brandRows]) => {
        setCategories(cats);
        setSubcategories(subs);
        setUnits(unitRows);
        setBrands(brandRows);
        const hit = subs.find((row) => categorySlug(row.name) === slug);
        if (hit) setParentName(subcategoryParentName(hit));
      })
      .catch((err) => {
        toast.error(err, "Could not load product options.");
      })
      .finally(() => setReady(true));
  }, [slug]);

  const matching = useMemo(
    () => (rows || []).filter((row) => categorySlug(row.subcategory ?? "") === slug),
    [rows, slug],
  );

  const displayName = useMemo(() => {
    const hit = subcategories.find((row) => categorySlug(row.name) === slug);
    if (hit) return hit.name;
    const fromProduct = matching[0]?.subcategory;
    if (fromProduct) return fromProduct;
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, [subcategories, matching, slug]);

  const filtered = matching.filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [row.name, row.sku, row.barcode, row.category, row.brand]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  const totalCost = matching.reduce((sum, item) => sum + item.onHand * (item.costMinor ?? 0), 0);
  const retailValue = matching.reduce((sum, item) => sum + item.onHand * item.priceMinor, 0);
  const lowCount = matching.filter((item) => stockTone(item) !== "ok").length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  function requireTaxonomy() {
    return Promise.all([
      listCategories(),
      listSubcategories(),
      listUnits(),
      listDirectory("manufacturers"),
    ]).then(([cats, subs, unitRows, brandRows]) => {
      setCategories(cats);
      setSubcategories(subs);
      setUnits(unitRows);
      setBrands(brandRows);
      return true;
    });
  }

  async function openAdd() {
    try {
      await requireTaxonomy();
    } catch (err) {
      toast.error(err, "Could not load product options.");
      return;
    }
    setDraft({ ...blank, category: parentName || displayName, subcategory: displayName });
    setImageFile(null);
    setConfirmId(null);
    setFormOpen(true);
  }

  function openEdit(item: HqCatalogItem) {
    setDraft(toDraft(item));
    setImageFile(null);
    setFormOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter a product name.");
      return;
    }
    const categoryValue = draft.category.trim() || parentName;
    if (!categoryValue) {
      toast.error("Choose a category.");
      return;
    }
    const subcategoryValue = draft.subcategory.trim() || displayName;
    setBusy(true);
    try {
      const sku =
        draft.sku.trim() ||
        draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
      const itemId = draft.id ?? sku.toLowerCase();
      const unitRow = units.find((row) => unitCode(row) === draft.unit);
      const packSize = Math.max(1, Math.round(parseFloat(draft.packSize) || 1));
      const costMinor = parseNairaInput(draft.cost);

      await importCatalogRows([
        {
          id: draft.id,
          name: draft.name.trim(),
          category: categoryValue,
          subcategory: subcategoryValue,
          sku: draft.sku.trim() || undefined,
          barcode: draft.barcode.trim() || undefined,
          batchNumber: draft.batchNumber.trim() || "",
          brand: draft.brand.trim() || "",
          costMinor,
          priceMinor: resolveSellPriceMinor({
            pricingMode: draft.pricingMode,
            costMinor,
            priceMinor: parseNairaInput(draft.price),
            marginInput: draft.marginInput,
          }),
          onHand: Math.max(0, Math.round(parseFloat(draft.onHand) || 0)),
          reorderLevel: Math.max(0, Math.round(parseFloat(draft.reorderLevel) || 0)),
          unit: draft.unit || "each",
          unitLabel: unitRow?.name || draft.unit,
          packSize,
          description: draft.description.trim() || "",
          active: draft.active,
          expiresAt: draft.expiresAt || "",
        },
      ]);

      if (imageFile) {
        const { uploadProductImage } = await import("@/lib/hq-api");
        await uploadProductImage(itemId, imageFile);
      }

      setFormOpen(false);
      toast.success(draft.id ? "Product updated." : "Product added to this subcategory.");
    } catch (err) {
      toast.error(err, draft.id ? "Could not save this product." : "Could not create this product.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: HqCatalogItem) {
    try {
      await deleteCatalogItem(item.id);
      removeItem(item.id);
      setConfirmId(null);
      toast.success("Product removed.");
    } catch (err) {
      toast.error(err, "Could not remove product.");
    }
  }

  return (
    <div className="relative space-y-5 text-pos-ink">
      <Link
        href="/setup/items/subgroups"
        className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface px-3.5 py-2 text-[13px] font-medium text-pos-ink-muted transition hover:text-pos-ink"
      >
        <ArrowLeft size={14} />
        All subcategories
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            {displayName}
          </h1>
          <p className="mt-3 text-[14px] text-pos-ink-muted">
            {matching.length} product{matching.length === 1 ? "" : "s"} · cost value{" "}
            {naira(totalCost, 0)} · {live ? "live sync on" : "live sync off"}
          </p>
          {parentName ? (
            <p className="mt-1 text-[13px] text-pos-ink-faint">Part of {parentName}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PrimaryButton onClick={openAdd} className="!rounded-xl shadow-pos-primary">
            <Plus size={16} strokeWidth={2.2} />
            Add product
          </PrimaryButton>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
            onClick={() => {
              if (matching.length === 0) {
                toast.info("No products in this subcategory to export.");
                return;
              }
              downloadCsv(`subcategory-${slug}.csv`, matching);
              toast.success("Subcategory products exported.");
            }}
          >
            <Download size={15} strokeWidth={2} />
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Products</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{matching.length}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Cost value</p>
          <p className="mt-2 truncate text-[22px] font-semibold tabular-nums">
            {naira(totalCost, 0)}
          </p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Selling value</p>
          <p className="mt-2 truncate text-[22px] font-semibold tabular-nums">
            {naira(retailValue, 0)}
          </p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Needs attention</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{lowCount}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="flex flex-wrap items-center gap-3 border-b border-pos-border/60 px-4 py-3.5 sm:px-5">
          <label className="relative min-w-[12rem] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border border-pos-border bg-pos-surface py-2.5 pl-9 pr-4 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25"
            />
          </label>
        </div>

        {matching.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-pos-ink-muted">No products in this subcategory yet.</p>
            <PrimaryButton onClick={openAdd}>
              <Plus size={16} />
              Add the first product
            </PrimaryButton>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-pos-ink-faint">
            No products match your search.
          </div>
        ) : (
          <ul className="divide-y divide-pos-border/45">
            {filtered.map((item) => {
              const status = productStatus(item);
              const tone = stockTone(item);
              const stockLabel =
                tone === "out"
                  ? "Out of stock"
                  : formatStock(
                      item.onHand,
                      item.unit ?? "each",
                      item.packSize ?? 1,
                      item.unitLabel,
                      inferUnitKind(item.unit),
                    );
              return (
                <li
                  key={item.id}
                  className="transition hover:bg-pos-surface-muted/50"
                >
                  <div className="flex items-center">
                    <Link
                      href={`/setup/items/items/${encodeURIComponent(item.id)}`}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5"
                    >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productImageSrc(item.id, item.image)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-pos-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-pos-ink">{item.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[12px] text-pos-ink-faint">
                        {item.sku}
                        {item.category ? ` · ${item.category}` : ""}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-[12px] font-medium tabular-nums sm:block text-pos-ink-muted">
                      {stockLabel}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-pos-ink">
                      {naira(item.priceMinor ?? 0)}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-ink"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => {
                      setConfirmId(null);
                      openEdit(item);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="mr-4 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-danger sm:mr-5"
                    aria-label={`Remove ${item.name}`}
                    onClick={() =>
                      setConfirmId((current) => (current === item.id ? null : item.id))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                  </div>
                  {confirmId === item.id ? (
                    <div className="border-t border-pos-border/60 bg-pos-surface-muted/50 px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] text-pos-ink-muted">
                          Remove{" "}
                          <span className="font-medium text-pos-ink">{item.name}</span> from the
                          catalog?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-full bg-pos-surface px-3 py-1.5 text-[12px] font-medium text-pos-ink"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                            onClick={() => remove(item)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ItemFormSheet
        open={formOpen}
        draft={draft}
        busy={busy}
        categories={categories}
        subcategories={subcategories}
        units={units}
        brands={brands}
        onClose={() => setFormOpen(false)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onImageChange={setImageFile}
        onSubmit={save}
      />
    </div>
  );
}