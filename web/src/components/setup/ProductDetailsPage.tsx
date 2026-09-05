"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Barcode,
  Boxes,
  History,
  Package,
  Pencil,
  Tag,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { marginPercent, nairaInputFromMinor, parseNairaInput, resolveSellPriceMinor } from "@/lib/catalog";
import { deleteCatalogItem, listSales, type HqCatalogItem, type HqSale } from "@/lib/hq-api";
import { listMovements, naira, prettyDay, type StockMovement } from "@/lib/hq-ops";
import { productImageSrc } from "@/lib/product-image";
import { importCatalogRows } from "@/lib/hq-setup";
import { toast } from "@/lib/toast";
import { formatMovementQty, formatStock, inferUnitKind } from "@/lib/units";
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

function stockTone(item: HqCatalogItem): "ok" | "low" | "out" {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= (item.reorderLevel ?? 5)) return "low";
  return "ok";
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
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

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            {label}
          </p>
          <p className="mt-1 truncate text-[19px] font-semibold leading-none tracking-tight text-pos-ink">
            {value}
          </p>
        </div>
      </div>
      {hint ? <p className="mt-2 truncate text-[12px] text-pos-ink-faint">{hint}</p> : null}
    </div>
  );
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

export function ProductDetailsPage({ id }: { id: string }) {
  const { items, removeItem, live } = useLiveCatalog();
  const [categories, setCategories] = useState<TaxonomyRecord[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyRecord[]>([]);
  const [units, setUnits] = useState<TaxonomyRecord[]>([]);
  const [brands, setBrands] = useState<TaxonomyRecord[]>([]);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ready, setReady] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sales, setSales] = useState<HqSale[]>([]);

  const item = useMemo(
    () => items.find((row) => row.id === id) ?? null,
    [items, id],
  );

  const itemMoves = useMemo(
    () =>
      movements
        .filter((move) => move.itemId === id)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [movements, id],
  );

  const salesByItem = useMemo(() => {
    if (!sales.length) return null;
    const name = item?.name ?? "";
    const lines = sales.flatMap((sale) =>
      (sale.lines ?? [])
        .filter((line) =>
          line.itemId ? line.itemId === id : Boolean(name) && line.name === name,
        )
        .map((line) => ({
          paidAt: sale.paidAt,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
        })),
    );
    if (!lines.length) return null;
    const cutoff = Date.now() - 30 * 86400000;
    let totalUnits = 0;
    let totalMinor = 0;
    let recentUnits = 0;
    let recentMinor = 0;
    let lastSold = "";
    for (const line of lines) {
      totalUnits += line.quantity;
      totalMinor += line.quantity * line.unitPriceMinor;
      if (line.paidAt > lastSold) lastSold = line.paidAt;
      if (new Date(line.paidAt).getTime() >= cutoff) {
        recentUnits += line.quantity;
        recentMinor += line.quantity * line.unitPriceMinor;
      }
    }
    return { totalUnits, totalMinor, recentUnits, recentMinor, lastSold };
  }, [sales, id, item?.name]);

  useEffect(() => {
    Promise.all([listCategories(), listSubcategories(), listUnits(), listDirectory("manufacturers")])
      .then(([cats, subs, unitRows, brandRows]) => {
        setCategories(cats);
        setSubcategories(subs);
        setUnits(unitRows);
        setBrands(brandRows);
      })
      .catch((err) => {
        toast.error(err, "Could not load product options.");
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    listMovements(id)
      .then(setMovements)
      .catch(() => setMovements([]));
    listSales()
      .then(setSales)
      .catch(() => setSales([]));
  }, [id]);

  useEffect(() => {
    if (!editOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEditOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [editOpen]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openEdit(item: HqCatalogItem) {
    setDraft(toDraft(item));
    setImageFile(null);
    setConfirmDelete(false);
    setEditOpen(true);
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Enter a product name.");
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
      const costMinor = parseNairaInput(draft.cost);

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

      setEditOpen(false);
      toast.success("Product updated.");
    } catch (err) {
      toast.error(err, "Could not save this product.");
    } finally {
      setBusy(false);
    }
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-pos-ink-muted">
        <Link
          href="/setup/items/items"
          className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface px-3.5 py-2 text-[13px] font-medium text-pos-ink shadow-pos-sm"
        >
          <ArrowLeft size={14} />
          All products
        </Link>
        <p className="text-sm">This product was not found or was removed.</p>
      </div>
    );
  }

  const status = productStatus(item);
  const unitKind = inferUnitKind(item.unit);
  const margin = marginPercent(item.costMinor ?? 0, item.priceMinor ?? 0);
  const stockValue = item.onHand * item.costMinor;
  const retailValue = item.onHand * item.priceMinor;

  return (
    <div className="relative space-y-5 text-pos-ink">
      <Link
        href="/setup/items/items"
        className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface px-3.5 py-2 text-[13px] font-medium text-pos-ink-muted transition hover:text-pos-ink"
      >
        <ArrowLeft size={14} />
        All products
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productImageSrc(item.id, item.image)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-pos-md"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
              {item.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-pos-ink-muted">
              <span className="font-mono text-pos-ink-faint">{item.sku}</span>
              <span>·</span>
              <span>{item.category}</span>
              {item.subcategory ? <span>· {item.subcategory}</span> : null}
              {item.brand ? <span>· {item.brand}</span> : null}
              <span>· {live ? "live" : "offline"}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${status.className}`}
          >
            {status.label}
          </span>
          <PrimaryButton onClick={() => openEdit(item)} className="!rounded-xl shadow-pos-primary">
            <Pencil size={15} />
            Edit product
          </PrimaryButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={<Wallet size={16} />}
          label="Selling price"
          value={naira(item.priceMinor ?? 0)}
          hint={`Cost ${naira(item.costMinor ?? 0)}`}
        />
        <Stat
          icon={<Boxes size={16} />}
          label="Stock on hand"
          value={formatStock(item.onHand, item.unit, item.packSize ?? 1, item.unitLabel, unitKind)}
          hint={
            (item.reorderLevel ?? 0) > 0 ? `Reorder at ${item.reorderLevel}` : "No reorder alert"
          }
        />
        <Stat
          icon={<Package size={16} />}
          label="Gross margin"
          value={`${margin}%`}
          hint={`${naira(Math.max(0, item.priceMinor - (item.costMinor ?? 0)))} markup`}
        />
        <Stat icon={<Tag size={16} />} label="Cost value" value={naira(stockValue, 0)} hint="Stock at cost price" />
        <Stat icon={<Tag size={16} />} label="Selling value" value={naira(retailValue, 0)} hint="Stock at selling price" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            Details
          </p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-pos-ink-muted">Product name</dt>
              <dd className="truncate font-medium text-pos-ink">{item.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-pos-ink-muted">Category</dt>
              <dd className="truncate font-medium text-pos-ink">{item.category}</dd>
            </div>
            {item.subcategory ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-pos-ink-muted">Subcategory</dt>
                <dd className="truncate font-medium text-pos-ink">{item.subcategory}</dd>
              </div>
            ) : null}
            {item.brand ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-pos-ink-muted">Brand</dt>
                <dd className="truncate font-medium text-pos-ink">{item.brand}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-pos-ink-muted">Unit</dt>
              <dd className="truncate font-medium text-pos-ink">
                {item.unitLabel || item.unit || "each"}
              </dd>
            </div>
            {item.packSize && item.packSize > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-pos-ink-muted">Pieces per unit</dt>
                <dd className="truncate font-medium text-pos-ink">{item.packSize}</dd>
              </div>
            ) : null}
            {item.expiresAt ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-pos-ink-muted">Expiry</dt>
                <dd className="truncate font-medium text-pos-ink">
                  {item.expiresAt.slice(0, 10)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-pos-ink-muted">Sells on tills</dt>
              <dd className="font-medium text-pos-ink">{item.active === false ? "No" : "Yes"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            Identifiers & batch
          </p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-pos-ink-muted">
                <Tag size={14} /> SKU
              </dt>
              <dd className="truncate font-mono text-pos-ink">{item.sku}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-pos-ink-muted">
                <Barcode size={14} /> Barcode
              </dt>
              <dd className="truncate font-mono text-pos-ink">{item.barcode || "—"}</dd>
            </div>
            {item.batchNumber ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-pos-ink-muted">
                  <Package size={14} /> Batch
                </dt>
                <dd className="truncate font-mono text-pos-ink">{item.batchNumber}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-pos-ink-muted">Reorder level</dt>
              <dd className="truncate font-medium text-pos-ink">{item.reorderLevel ?? 0}</dd>
            </div>
          </dl>
          {item.description ? (
            <div className="mt-4 border-t border-pos-border/60 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                Description
              </p>
              <p className="text-sm leading-relaxed text-pos-ink-muted">{item.description}</p>
            </div>
          ) : null}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-pos-ink-faint" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            Sales & demand
          </p>
        </div>
        {salesByItem ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              icon={<Boxes size={16} />}
              label="Units sold"
              value={String(salesByItem.totalUnits)}
              hint={
                salesByItem.recentUnits > 0
                  ? `${salesByItem.recentUnits} in the last 30 days`
                  : "No sales in the last 30 days"
              }
            />
            <Stat
              icon={<Wallet size={16} />}
              label="Lifetime revenue"
              value={naira(salesByItem.totalMinor, 0)}
              hint={`${naira(salesByItem.recentMinor, 0)} in the last 30 days`}
            />
            <Stat
              icon={<History size={16} />}
              label="Last sold"
              value={prettyDay(salesByItem.lastSold.slice(0, 10))}
              hint={timeOf(salesByItem.lastSold)}
            />
          </div>
        ) : (
          <div className="rounded-[20px] bg-pos-surface px-5 py-10 text-center text-sm text-pos-ink-faint shadow-pos-sm">
            No recorded sales for this product yet.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History size={15} className="text-pos-ink-faint" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
              Stock movements
            </p>
          </div>
          <Link
            href="/reports/stock/movement"
            className="text-[12px] font-medium text-pos-primary transition hover:underline"
          >
            View all movements
          </Link>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pos-border/60 text-left text-[11px] uppercase tracking-wide text-pos-ink-faint">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/45">
                {itemMoves.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-pos-ink-faint"
                    >
                      No stock movements recorded for this product yet.
                    </td>
                  </tr>
                ) : (
                  itemMoves.slice(0, 25).map((move) => (
                    <tr key={move.id} className="transition hover:bg-pos-surface-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-pos-ink-muted">
                        {prettyDay(move.at.slice(0, 10))} · {timeOf(move.at)}
                      </td>
                      <td className="px-4 py-3 capitalize text-pos-ink-muted">{move.type}</td>
                      <td
                        className={`px-4 py-3 font-semibold tabular-nums ${
                          move.quantity < 0 ? "text-pos-danger" : "text-pos-success"
                        }`}
                      >
                        {formatMovementQty(move.quantity, item.unit, item.unitLabel)}
                      </td>
                      <td className="px-4 py-3 text-pos-ink-muted">
                        {move.type === "transfer"
                          ? `${move.from || "—"} → ${move.to || "—"}`
                          : move.reason ||
                            (typeof move.countedOnHand === "number"
                              ? `Counted ${move.countedOnHand}`
                              : "—")}
                      </td>
                      <td className="px-4 py-3 text-pos-ink-muted">{move.staff || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {item ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-danger shadow-pos-sm transition hover:bg-red-500/10"
            onClick={() => setConfirmDelete((value) => !value)}
          >
            <Trash2 size={15} />
            Delete product
          </button>
        </div>
      ) : null}
      {item && confirmDelete ? (
        <div className="rounded-[20px] border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-pos-ink-muted">
              Permanently remove <span className="font-medium text-pos-ink">{item.name}</span> from
              the catalog?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full bg-pos-surface px-3 py-1.5 text-[12px] font-medium text-pos-ink"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                onClick={async () => {
                  try {
                    await deleteCatalogItem(item.id);
                    removeItem(item.id);
                    setConfirmDelete(false);
                  } catch (err) {
                    toast.error(err, "Could not remove product.");
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen && draft ? (
        <ItemFormSheet
          open={editOpen}
          draft={draft}
          busy={busy}
          categories={categories}
          subcategories={subcategories}
          units={units}
          brands={brands}
          onClose={() => setEditOpen(false)}
          onChange={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
          onImageChange={setImageFile}
          onSubmit={save}
        />
      ) : null}
    </div>
  );
}