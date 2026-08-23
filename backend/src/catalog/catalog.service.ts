import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { CATALOG_SEED, type CatalogItem } from "./catalog.seed";
import { loadCatalogFile, saveCatalogFile } from "./catalog.store";
import {
  generateBarcode,
  generateSku,
  marginPercent,
  normalizeCatalogItem,
  slugFromName,
} from "./catalog.utils";
import { CloudinaryService } from "./cloudinary.service";

export type { CatalogItem };
export type CatalogEvent =
  | { type: "snapshot"; items: CatalogItem[] }
  | { type: "updated"; item: CatalogItem };

const now = () => new Date().toISOString();

export type CatalogRow = {
  id?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  sku?: string;
  barcode?: string;
  batchNumber?: string;
  brand?: string;
  costMinor?: number;
  priceMinor?: number;
  onHand?: number;
  reorderLevel?: number;
  unit?: string;
  unitLabel?: string;
  packSize?: number;
  description?: string;
  active?: boolean;
  image?: string;
  expiresAt?: string;
};

export type CatalogPatch = {
  priceMinor?: number;
  costMinor?: number;
  onHand?: number;
  reorderLevel?: number;
  image?: string;
  batchNumber?: string;
  brand?: string;
  subcategory?: string;
  unit?: string;
  unitLabel?: string;
  packSize?: number;
  description?: string;
  active?: boolean;
};

@Injectable()
export class CatalogService implements OnModuleInit {
  private items: CatalogItem[] = CATALOG_SEED.map((item) => this.normalizeLoaded(item));
  private readonly events = new Subject<CatalogEvent>();

  constructor(private readonly cloudinary: CloudinaryService) {}

  async onModuleInit() {
    const stored = await loadCatalogFile();
    if (stored?.length) {
      this.items = stored.map((item) => this.normalizeLoaded(item));
      void this.persist();
    }
  }

  private normalizeLoaded(raw: Partial<CatalogItem> & { id?: string; name?: string }) {
    const name = raw.name?.trim() || raw.id || "item";
    const id = raw.id?.trim() || slugFromName(name) || "item";
    const fallbackCost =
      typeof raw.priceMinor === "number" && raw.priceMinor > 0
        ? Math.round(raw.priceMinor * 0.65)
        : 0;
    return normalizeCatalogItem({
      ...raw,
      id,
      name,
      costMinor: raw.costMinor ?? fallbackCost,
      reorderLevel: raw.reorderLevel ?? 5,
      unit: raw.unit ?? "each",
      unitLabel: raw.unitLabel ?? "Each",
      packSize: raw.packSize ?? 1,
      active: raw.active !== false,
    });
  }

  private barcodeSet(excludeId?: string) {
    return new Set(
      this.items.filter((item) => item.id !== excludeId).map((item) => item.barcode.toLowerCase()),
    );
  }

  private skuSet(excludeId?: string) {
    return new Set(
      this.items.filter((item) => item.id !== excludeId).map((item) => item.sku.toLowerCase()),
    );
  }

  list() {
    return this.items;
  }

  lookup(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (
      this.items.find(
        (item) =>
          item.active !== false &&
          (item.barcode.toLowerCase() === q ||
            item.sku.toLowerCase() === q ||
            item.id.toLowerCase() === q ||
            item.batchNumber?.toLowerCase() === q),
      ) ??
      this.items.find(
        (item) => item.active !== false && item.name.toLowerCase().includes(q),
      ) ??
      null
    );
  }

  findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  update(id: string, patch: CatalogPatch) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const current = this.items[index]!;
    const next = normalizeCatalogItem({
      ...current,
      costMinor:
        typeof patch.costMinor === "number" && Number.isFinite(patch.costMinor)
          ? patch.costMinor
          : current.costMinor,
      priceMinor:
        typeof patch.priceMinor === "number" && Number.isFinite(patch.priceMinor)
          ? patch.priceMinor
          : current.priceMinor,
      onHand:
        typeof patch.onHand === "number" && Number.isFinite(patch.onHand)
          ? patch.onHand
          : current.onHand,
      reorderLevel:
        typeof patch.reorderLevel === "number" && Number.isFinite(patch.reorderLevel)
          ? patch.reorderLevel
          : current.reorderLevel,
      image: typeof patch.image === "string" ? patch.image : current.image,
      batchNumber:
        typeof patch.batchNumber === "string" ? patch.batchNumber : current.batchNumber,
      brand: typeof patch.brand === "string" ? patch.brand : current.brand,
      subcategory:
        typeof patch.subcategory === "string" ? patch.subcategory : current.subcategory,
      unit: typeof patch.unit === "string" ? patch.unit : current.unit,
      unitLabel: typeof patch.unitLabel === "string" ? patch.unitLabel : current.unitLabel,
      packSize:
        typeof patch.packSize === "number" && Number.isFinite(patch.packSize)
          ? patch.packSize
          : current.packSize,
      description:
        typeof patch.description === "string" ? patch.description : current.description,
      active: typeof patch.active === "boolean" ? patch.active : current.active,
      updatedAt: now(),
    });
    this.items[index] = next;
    void this.persist();
    this.events.next({ type: "updated", item: next });
    return next;
  }

  applyStockDeltas(deltas: Array<{ itemId?: string; delta?: number }>) {
    const applied: CatalogItem[] = [];
    for (const entry of deltas.slice(0, 500)) {
      const itemId = typeof entry?.itemId === "string" ? entry.itemId : "";
      const delta = Math.round(Number(entry?.delta));
      if (!itemId || !Number.isFinite(delta) || delta === 0) continue;
      const item = this.update(itemId, {
        onHand: Math.max(0, (this.findById(itemId)?.onHand ?? 0) + delta),
      });
      if (item) applied.push(item);
    }
    return { updated: applied.length, items: applied };
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    const current = this.findById(id);
    if (!current) throw new NotFoundException("Item not found");
    const image = await this.cloudinary.uploadProductImage(file, id);
    return this.update(id, { image })!;
  }

  stream(): Observable<CatalogEvent> {
    return new Observable((subscriber) => {
      subscriber.next({ type: "snapshot", items: this.items });
      const sub = this.events.subscribe((event) => subscriber.next(event));
      return () => sub.unsubscribe();
    });
  }

  upsertMany(rows: CatalogRow[]) {
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) continue;

      const existing =
        (row.id ? this.items.find((item) => item.id === row.id) : null) ??
        (row.sku?.trim()
          ? this.items.find((item) => item.sku.toLowerCase() === row.sku!.trim().toLowerCase())
          : null) ??
        (row.barcode?.trim()
          ? this.items.find(
              (item) => item.barcode.toLowerCase() === row.barcode!.trim().toLowerCase(),
            )
          : null);

      const excludeId = existing?.id;
      const sku =
        row.sku?.trim() ||
        existing?.sku ||
        generateSku(name, this.skuSet(excludeId));

      let barcode = row.barcode?.trim() || existing?.barcode || "";
      if (!barcode) {
        barcode = generateBarcode(this.barcodeSet(excludeId));
      }

      const expiresAt =
        row.expiresAt === ""
          ? undefined
          : row.expiresAt?.trim()
            ? new Date(row.expiresAt).toISOString()
            : existing?.expiresAt;

      const next = normalizeCatalogItem({
        id: existing?.id ?? (slugFromName(sku) || slugFromName(name) || `item-${Date.now()}`),
        name,
        category: row.category?.trim() || existing?.category || "General",
        subcategory:
          row.subcategory !== undefined
            ? row.subcategory.trim() || undefined
            : existing?.subcategory,
        sku,
        barcode,
        batchNumber:
          row.batchNumber !== undefined
            ? row.batchNumber.trim() || undefined
            : existing?.batchNumber,
        brand:
          row.brand !== undefined
            ? row.brand.trim() || undefined
            : existing?.brand,
        costMinor:
          typeof row.costMinor === "number" && Number.isFinite(row.costMinor)
            ? row.costMinor
            : existing?.costMinor ?? 0,
        priceMinor:
          typeof row.priceMinor === "number" && Number.isFinite(row.priceMinor)
            ? row.priceMinor
            : existing?.priceMinor ?? 0,
        currency: "NGN",
        image:
          typeof row.image === "string" ? row.image.trim() : existing?.image ?? "",
        onHand:
          typeof row.onHand === "number" && Number.isFinite(row.onHand)
            ? row.onHand
            : existing?.onHand ?? 0,
        reorderLevel:
          typeof row.reorderLevel === "number" && Number.isFinite(row.reorderLevel)
            ? row.reorderLevel
            : existing?.reorderLevel ?? 5,
        unit: row.unit?.trim() || existing?.unit || "each",
        unitLabel:
          row.unitLabel?.trim() ||
          existing?.unitLabel ||
          row.unit?.trim() ||
          "Each",
        packSize:
          typeof row.packSize === "number" && Number.isFinite(row.packSize)
            ? Math.max(1, Math.round(row.packSize))
            : existing?.packSize ?? 1,
        description:
          row.description !== undefined
            ? row.description.trim() || undefined
            : existing?.description,
        active: row.active !== undefined ? row.active !== false : existing?.active !== false,
        updatedAt: now(),
        expiresAt,
      });

      if (existing) {
        this.items = this.items.map((item) => (item.id === existing.id ? next : item));
        updated += 1;
      } else {
        this.items.push(next);
        created += 1;
      }
      this.events.next({ type: "updated", item: next });
    }
    void this.persist();
    return { created, updated, total: this.items.length };
  }

  resetToSeed() {
    this.items = CATALOG_SEED.map((item) => this.normalizeLoaded(item));
    void this.persist();
    this.events.next({ type: "snapshot", items: this.items });
    return { ok: true, total: this.items.length };
  }

  stats() {
    const active = this.items.filter((item) => item.active !== false);
    const stockValueMinor = active.reduce(
      (sum, item) => sum + item.onHand * item.costMinor,
      0,
    );
    const retailValueMinor = active.reduce(
      (sum, item) => sum + item.onHand * item.priceMinor,
      0,
    );
    return {
      total: this.items.length,
      active: active.length,
      lowStock: active.filter((item) => item.onHand <= item.reorderLevel).length,
      stockValueMinor,
      retailValueMinor,
    };
  }

  marginPercent(item: CatalogItem) {
    return marginPercent(item.costMinor, item.priceMinor);
  }

  countBy(field: "category" | "subcategory" | "unit", value: string) {
    const key = value.trim().toLowerCase();
    if (!key) return 0;
    return this.items.filter((item) => {
      const current =
        field === "category"
          ? item.category
          : field === "subcategory"
            ? item.subcategory ?? ""
            : item.unit;
      return current.toLowerCase() === key;
    }).length;
  }

  taxonomyUsage() {
    const categories = new Map<string, number>();
    const subcategories = new Map<string, number>();
    const units = new Map<string, number>();
    for (const item of this.items) {
      categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
      if (item.subcategory?.trim()) {
        subcategories.set(
          item.subcategory,
          (subcategories.get(item.subcategory) ?? 0) + 1,
        );
      }
      units.set(item.unit, (units.get(item.unit) ?? 0) + 1);
    }
    const pack = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([name, products]) => ({ name, products }))
        .sort((a, b) => b.products - a.products || a.name.localeCompare(b.name));
    return {
      categories: pack(categories),
      subcategories: pack(subcategories),
      units: pack(units),
    };
  }

  renameTaxonomy(
    field: "category" | "subcategory" | "unit",
    from: string,
    to: string,
  ) {
    const source = from.trim();
    const target = to.trim();
    if (!source || !target || source.toLowerCase() === target.toLowerCase()) {
      return { updated: 0 };
    }
    let updated = 0;
    this.items = this.items.map((item) => {
      const current =
        field === "category"
          ? item.category
          : field === "subcategory"
            ? item.subcategory ?? ""
            : item.unit;
      if (current.toLowerCase() !== source.toLowerCase()) return item;
      updated += 1;
      const patch =
        field === "category"
          ? { category: target }
          : field === "subcategory"
            ? { subcategory: target }
            : { unit: target };
      const next = normalizeCatalogItem({ ...item, ...patch, updatedAt: now() });
      this.events.next({ type: "updated", item: next });
      return next;
    });
    void this.persist();
    return { updated };
  }

  private async persist() {
    try {
      await saveCatalogFile(this.items);
    } catch {
      // Keep in-memory catalog live even if disk write fails.
    }
  }
}
