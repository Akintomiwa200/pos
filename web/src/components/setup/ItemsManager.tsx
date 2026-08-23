"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { nairaInputFromMinor, parseNairaInput } from "@/lib/catalog";
import { listCatalog, uploadProductImage, type HqCatalogItem } from "@/lib/hq-api";
import { importCatalogRows } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { productImageSrc } from "@/lib/product-image";
import { toast } from "@/lib/toast";
import { formatStock } from "@/lib/units";
import { useLiveCatalog } from "@/lib/live-catalog";
import {
  listCategories,
  listSubcategories,
  listUnits,
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
  onHand: "",
  reorderLevel: "5",
  unit: "each",
  packSize: "1",
  description: "",
  active: true,
  expiresAt: "",
};

const PAGE_SIZES = [10, 25, 50] as const;

type StatusFilter = "all" | "active" | "inactive" | "low" | "out";

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

function stockTone(item: HqCatalogItem): "ok" | "low" | "out" {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= (item.reorderLevel ?? 5)) return "low";
  return "ok";
}

function productStatus(item: HqCatalogItem): {
  label: string;
  className: string;
} {
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

const outlineBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted";

const filterSelect =
  "appearance-none rounded-xl border border-pos-border bg-pos-surface py-2.5 pl-3.5 pr-9 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25";

export function ItemsManager() {
  const { items: rows, setItems: setRows, live } = useLiveCatalog();
  const [categories, setCategories] = useState<TaxonomyRecord[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyRecord[]>([]);
  const [units, setUnits] = useState<TaxonomyRecord[]>([]);
  const [brands, setBrands] = useState<TaxonomyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(blank);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [catalog, cats, subs, unitRows, brandRows] = await Promise.all([
      listCatalog(),
      listCategories(),
      listSubcategories(),
      listUnits(),
      listDirectory("manufacturers"),
    ]);
    setRows(catalog);
    setCategories(cats);
    setSubcategories(subs);
    setUnits(unitRows);
    setBrands(brandRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load your product catalog.");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, pageSize]);

  useEffect(() => {
    function closeMenu() {
      setMenuId(null);
    }
    if (!menuId) return;
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [menuId]);

  const categoryOptions = useMemo(() => {
    const names = new Set(rows.map((row) => row.category).filter(Boolean));
    for (const row of categories) names.add(row.name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows, categories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (statusFilter === "active" && row.active === false) return false;
      if (statusFilter === "inactive" && row.active !== false) return false;
      if (statusFilter === "low" && stockTone(row) !== "low") return false;
      if (statusFilter === "out" && stockTone(row) !== "out") return false;
      if (!query) return true;
      return [row.name, row.sku, row.barcode, row.category, row.subcategory, row.batchNumber, row.brand]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(row.id));

  const pageButtons = useMemo(() => {
    const buttons: number[] = [];
    const windowSize = 5;
    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    const end = Math.min(pageCount, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    for (let i = start; i <= end; i += 1) buttons.push(i);
    return buttons;
  }, [safePage, pageCount]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDraft(blank);
    setImageFile(null);
    setOpen(true);
  }

  function openEdit(item: HqCatalogItem) {
    setDraft(toDraft(item));
    setImageFile(null);
    setOpen(true);
    setMenuId(null);
  }

  function toggleAllPage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        for (const row of pageRows) next.delete(row.id);
      } else {
        for (const row of pageRows) next.add(row.id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter a product name.");
      return;
    }
    if (!draft.category.trim()) {
      toast.error("Choose a category.");
      return;
    }

    setBusy(true);
    try {
      const sku =
        draft.sku.trim() ||
        draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
      const itemId = draft.id ?? sku.toLowerCase();
      const unitRow = units.find((row) => unitCode(row) === draft.unit);
      const packSize = Math.max(1, Math.round(parseFloat(draft.packSize) || 1));

      await importCatalogRows([
        {
          id: draft.id,
          name: draft.name.trim(),
          category: draft.category.trim(),
          subcategory: draft.subcategory.trim() || "",
          sku: draft.sku.trim() || undefined,
          barcode: draft.barcode.trim() || undefined,
          batchNumber: draft.batchNumber.trim() || "",
          brand: draft.brand.trim() || "",
          costMinor: parseNairaInput(draft.cost),
          priceMinor: parseNairaInput(draft.price),
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
        await uploadProductImage(itemId, imageFile);
      }

      await load();
      setOpen(false);
      toast.success(draft.id ? "Product updated." : "Product added to catalog.");
    } catch (err) {
      toast.error(err, draft.id ? "Could not save this product." : "Could not create this product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-pos-ink sm:text-[24px]">
            Products List
          </h1>
          <p className="mt-1 text-[13px] text-pos-ink-muted">
            {rows.length} products
            {selected.size > 0 ? ` · ${selected.size} selected` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/setup/others/import" className={outlineBtn}>
            <Download size={16} strokeWidth={2} />
            Import
          </Link>
          <Link href="/setup/others/export" className={outlineBtn}>
            <Upload size={16} strokeWidth={2} />
            Export
          </Link>
          <PrimaryButton
            onClick={openNew}
            className="!rounded-xl shadow-pos-primary"
          >
            <Plus size={16} strokeWidth={2.2} />
            Add Product
          </PrimaryButton>
        </div>
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="flex flex-wrap items-center gap-3 border-b border-pos-border/60 px-4 py-3.5 sm:px-5">
          <label className="relative min-w-[12rem] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-pos-border bg-pos-surface py-2.5 pl-10 pr-4 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className={filterSelect}
                aria-label="Filter by status"
              >
                <option value="all">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="low">Low stock</option>
                <option value="out">Stock out</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
            </label>

            <label className="relative">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className={`${filterSelect} min-w-[8.5rem]`}
                aria-label="Filter by category"
              >
                <option value="">Category</option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
            </label>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
              title={live ? "Catalog is live" : "Live sync offline"}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-pos-border text-pos-ink-muted transition hover:bg-pos-surface-muted"
              aria-label="Filters"
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("");
                setSearch("");
              }}
              title="Clear filters"
            >
              <SlidersHorizontal size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-pos-border/60 text-[12px] font-medium text-pos-ink-muted">
                <th className="w-12 px-4 py-3.5 sm:px-5">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllPage}
                    className="h-4 w-4 rounded border-pos-border accent-pos-primary"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-3 py-3.5 font-medium">Product Name</th>
                <th className="px-3 py-3.5 font-medium">Category</th>
                <th className="px-3 py-3.5 font-medium">Stock</th>
                <th className="px-3 py-3.5 font-medium">Price</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                <th className="w-16 px-3 py-3.5 text-right font-medium sm:pr-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/45">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-pos-ink-faint">
                    {search.trim() || statusFilter !== "all" || categoryFilter
                      ? "No products match your filters."
                      : "No products yet. Add your first item."}
                  </td>
                </tr>
              ) : (
                pageRows.map((item) => {
                  const tone = stockTone(item);
                  const status = productStatus(item);
                  const stockLabel =
                    tone === "out"
                      ? "Out of Stock"
                      : tone === "low"
                        ? "Low Stock"
                        : formatStock(
                            item.onHand,
                            item.unit ?? "each",
                            item.packSize ?? 1,
                            item.unitLabel,
                          );
                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-pos-surface-muted/50"
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 rounded border-pos-border accent-pos-primary"
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-3 text-left"
                          onClick={() => openEdit(item)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={productImageSrc(item.id, item.image)}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-pos-sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-pos-ink">
                              {item.name}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[12px] text-pos-ink-faint">
                              {item.sku}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3.5 text-pos-ink-muted">
                        <p>{item.category}</p>
                        {item.subcategory ? (
                          <p className="mt-0.5 text-[12px] text-pos-ink-faint">
                            {item.subcategory}
                          </p>
                        ) : null}
                      </td>
                      <td
                        className={`px-3 py-3.5 font-medium tabular-nums ${
                          tone === "out"
                            ? "text-pos-danger"
                            : tone === "low"
                              ? "text-pos-warning"
                              : "text-pos-ink"
                        }`}
                      >
                        {stockLabel}
                      </td>
                      <td className="px-3 py-3.5 font-medium tabular-nums text-pos-ink">
                        {naira(item.priceMinor)}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold ${status.className}`}
                        >
                          {status.label}
                          <ChevronDown size={12} className="opacity-60" />
                        </span>
                      </td>
                      <td className="relative px-3 py-3.5 text-right sm:pr-5">
                        <button
                          type="button"
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-ink"
                          aria-label={`Actions for ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId((current) => (current === item.id ? null : item.id));
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuId === item.id ? (
                          <div className="absolute right-4 top-11 z-20 min-w-[140px] overflow-hidden rounded-xl border border-pos-border bg-pos-surface py-1 shadow-pos-md">
                            <button
                              type="button"
                              className="block w-full px-3.5 py-2 text-left text-sm text-pos-ink hover:bg-pos-surface-muted"
                              onClick={() => openEdit(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3.5 py-2 text-left text-sm text-pos-ink hover:bg-pos-surface-muted"
                              onClick={() => {
                                setMenuId(null);
                                navigator.clipboard
                                  .writeText(item.sku || item.id)
                                  .then(
                                    () => toast.success("SKU copied."),
                                    () => toast.error("Could not copy SKU."),
                                  );
                              }}
                            >
                              Copy SKU
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 px-4 py-3.5 sm:px-5">
          <p className="text-[13px] text-pos-ink-muted">
            Result {pageStart}-{pageEnd} of {filtered.length}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative inline-flex items-center gap-2 text-[13px] text-pos-ink-muted">
              <span className="sr-only">Rows per page</span>
              <select
                value={pageSize}
                onChange={(event) =>
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])
                }
                className="appearance-none rounded-lg border border-pos-border bg-pos-surface py-1.5 pl-2.5 pr-7 text-[13px] text-pos-ink outline-none focus:border-pos-primary"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              {pageButtons.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] font-medium transition ${
                    num === safePage
                      ? "border border-pos-primary text-pos-primary"
                      : "text-pos-ink-muted hover:bg-pos-surface-muted"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <ItemFormSheet
        open={open}
        draft={draft}
        busy={busy}
        categories={categories}
        subcategories={subcategories}
        units={units}
        brands={brands}
        onClose={() => setOpen(false)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onImageChange={setImageFile}
        onSubmit={save}
      />
    </div>
  );
}
