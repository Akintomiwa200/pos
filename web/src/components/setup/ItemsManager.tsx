"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { marginPercent, nairaInputFromMinor, parseNairaInput } from "@/lib/catalog";
import { listCatalog, uploadProductImage, type HqCatalogItem } from "@/lib/hq-api";
import { importCatalogRows } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { productImageSrc } from "@/lib/product-image";
import { toast } from "@/lib/toast";
import { formatStock } from "@/lib/units";
import { useLiveCatalog, syncStockLevelsFromCatalog } from "@/lib/live-catalog";
import {
  listCategories,
  listSubcategories,
  listUnits,
  unitCode,
  type TaxonomyRecord,
} from "@/lib/hq-taxonomy";
import { ManagerSkeleton } from "../Skeleton";
import { DataTable, PrimaryButton, SetupHeader } from "./SetupChrome";
import { ItemFormSheet, type ItemDraft } from "./ItemFormSheet";

const blank: ItemDraft = {
  name: "",
  category: "",
  subcategory: "",
  sku: "",
  barcode: "",
  batchNumber: "",
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

function toDraft(item: HqCatalogItem): ItemDraft {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? "",
    sku: item.sku,
    barcode: item.barcode,
    batchNumber: item.batchNumber ?? "",
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

export function ItemsManager() {
  const { items: rows, setItems: setRows, live } = useLiveCatalog();
  const [categories, setCategories] = useState<TaxonomyRecord[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyRecord[]>([]);
  const [units, setUnits] = useState<TaxonomyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ItemDraft>(blank);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [catalog, cats, subs, unitRows] = await Promise.all([
      listCatalog(),
      listCategories(),
      listSubcategories(),
      listUnits(),
    ]);
    setRows(catalog);
    setCategories(cats);
    setSubcategories(subs);
    setUnits(unitRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load your product catalog.");
      setReady(true);
    });
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.name, row.sku, row.barcode, row.category, row.subcategory, row.batchNumber]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [rows, search]);

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
      const packSize =
        Math.max(1, Math.round(parseFloat(draft.packSize) || 1));

      await importCatalogRows([
        {
          id: draft.id,
          name: draft.name.trim(),
          category: draft.category.trim(),
          subcategory: draft.subcategory.trim() || "",
          sku: draft.sku.trim() || undefined,
          barcode: draft.barcode.trim() || undefined,
          batchNumber: draft.batchNumber.trim() || "",
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

  const stockCostValue = rows.reduce(
    (sum, row) => sum + row.onHand * (row.costMinor ?? 0),
    0,
  );
  const stockRetailValue = rows.reduce((sum, row) => sum + row.onHand * row.priceMinor, 0);

  return (
    <div>
      <SetupHeader
        kicker="Setup · Products"
        title="All Products"
        copy={`${rows.length} products · stock at cost ${naira(stockCostValue, 0)} · retail ${naira(stockRetailValue, 0)}${live ? " · live" : ""}.`}
        action={
          <PrimaryButton onClick={openNew}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New item
            </span>
          </PrimaryButton>
        }
      />

      <label className="relative mb-4 block">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pos-ink-faint"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, SKU, barcode, batch…"
          className="w-full rounded-full border border-pos-border bg-pos-surface py-2.5 pl-11 pr-4 text-sm text-pos-ink outline-none focus:border-pos-primary"
        />
      </label>

      <DataTable
        columns={[
          "",
          "Name",
          "Category",
          "Subcategory",
          "Cost",
          "Sell",
          "Margin",
          "Stock",
          "Status",
        ]}
      >
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={9}>
              {search.trim() ? "No products match your search." : "No products yet. Add your first item."}
            </td>
          </tr>
        ) : (
          filtered.map((item) => {
            const margin = marginPercent(item.costMinor ?? 0, item.priceMinor);
            const low = item.onHand <= (item.reorderLevel ?? 5);
            return (
              <tr
                key={item.id}
                className="cursor-pointer border-b border-pos-border/60 transition hover:bg-pos-surface-muted"
                onClick={() => openEdit(item)}
              >
                <td className="px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productImageSrc(item.id, item.image)}
                    alt=""
                    className="h-11 w-11 rounded-xl border border-pos-border object-cover shadow-pos-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-pos-ink">{item.name}</p>
                  <p className="text-xs text-pos-ink-muted">{item.sku}</p>
                </td>
                <td className="px-4 py-3 text-pos-ink-muted">{item.category}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{item.subcategory || "—"}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{naira(item.costMinor ?? 0)}</td>
                <td className="px-4 py-3 font-medium">{naira(item.priceMinor)}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{margin}%</td>
                <td className={`px-4 py-3 ${low ? "font-semibold text-pos-danger" : ""}`}>
                  {formatStock(
                    item.onHand,
                    item.unit ?? "each",
                    item.packSize ?? 1,
                    item.unitLabel,
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.active === false
                        ? "bg-pos-surface-muted text-pos-ink-faint"
                        : low
                          ? "bg-pos-danger/10 text-pos-danger"
                          : "bg-pos-primary/10 text-pos-primary"
                    }`}
                  >
                    {item.active === false ? "Inactive" : low ? "Low stock" : "Active"}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      <ItemFormSheet
        open={open}
        draft={draft}
        busy={busy}
        categories={categories}
        subcategories={subcategories}
        units={units}
        onClose={() => setOpen(false)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onImageChange={setImageFile}
        onSubmit={save}
      />
    </div>
  );
}
