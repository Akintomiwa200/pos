import type { CatalogItem } from "./catalog.seed";

export function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export function generateSku(name: string, existingSkus: Set<string>) {
  const base = slugFromName(name) || "item";
  if (!existingSkus.has(base.toLowerCase())) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 24);
    if (!existingSkus.has(candidate.toLowerCase())) return candidate;
  }
  return `${base.slice(0, 18)}-${Date.now().toString().slice(-5)}`;
}

/** Internal-store barcode in 890xxxxxxxxx range (matches seed convention). */
/** Auto product code derived from the (unique) SKU so it stays stable across re-imports. */
export function generateProductCode(sku: string) {
  const base = sku
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  return `PC-${base || "ITEM"}`.slice(0, 28);
}

export function generateBarcode(existingBarcodes: Set<string>) {
  let seed = 8901234560000;
  for (const code of existingBarcodes) {
    const n = Number(code.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > seed) seed = n;
  }
  for (let i = 1; i < 100_000; i += 1) {
    const candidate = String(seed + i);
    if (!existingBarcodes.has(candidate)) return candidate;
  }
  return `890${Date.now()}`.slice(0, 13);
}

export function normalizeTaxPercent(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, value));
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.min(100, Math.max(0, n));
  }
  return 0;
}

export function normalizeCatalogItem(raw: Partial<CatalogItem> & Pick<CatalogItem, "id" | "name">): CatalogItem {
  const costMinor =
    typeof raw.costMinor === "number" && Number.isFinite(raw.costMinor)
      ? Math.max(0, Math.round(raw.costMinor))
      : 0;
  const priceMinor =
    typeof raw.priceMinor === "number" && Number.isFinite(raw.priceMinor)
      ? Math.max(0, Math.round(raw.priceMinor))
      : 0;
  const branchPriceMinor =
    typeof raw.branchPriceMinor === "number" && Number.isFinite(raw.branchPriceMinor)
      ? Math.max(0, Math.round(raw.branchPriceMinor))
      : undefined;
  const onHand =
    typeof raw.onHand === "number" && Number.isFinite(raw.onHand)
      ? Math.max(0, Math.round(raw.onHand))
      : 0;
  const reorderLevel =
    typeof raw.reorderLevel === "number" && Number.isFinite(raw.reorderLevel)
      ? Math.max(0, Math.round(raw.reorderLevel))
      : 0;

  const sku = raw.sku?.trim() || slugFromName(raw.name) || raw.id;

  return {
    id: raw.id,
    name: raw.name.trim(),
    category: raw.category?.trim() || "General",
    subcategory: raw.subcategory?.trim() || undefined,
    sku,
    barcode: raw.barcode?.trim() || "",
    batchNumber: raw.batchNumber?.trim() || undefined,
    brand: raw.brand?.trim() || undefined,
    productCode: raw.productCode?.trim() || generateProductCode(sku),
    trackBatches: raw.trackBatches === true,
    baseId: raw.baseId?.trim() || undefined,
    costMinor,
    priceMinor,
    branchPriceMinor,
    pricingSystem: raw.pricingSystem === "branch" ? "branch" : "main",
    /** Price a till/price-check should actually charge or show for this item, live. */
    effectivePriceMinor:
      raw.pricingSystem === "branch" &&
      typeof raw.branchPriceMinor === "number" &&
      Number.isFinite(raw.branchPriceMinor)
        ? Math.max(0, Math.round(raw.branchPriceMinor))
        : priceMinor,
    currency: "NGN",
    image: raw.image?.trim() || "",
    onHand,
    reorderLevel,
    unit: raw.unit?.trim() || "each",
    unitLabel: raw.unitLabel?.trim() || raw.unit?.trim() || "Each",
    packSize:
      typeof raw.packSize === "number" && Number.isFinite(raw.packSize)
        ? Math.max(1, Math.round(raw.packSize))
        : 1,
    description: raw.description?.trim() || undefined,
    active: raw.active !== false,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    expiresAt: raw.expiresAt?.trim() ? new Date(raw.expiresAt).toISOString() : undefined,
    taxPercent:
      raw.taxPercent !== undefined ? normalizeTaxPercent(raw.taxPercent) : undefined,
  };
}

export function marginPercent(costMinor: number, priceMinor: number) {
  if (priceMinor <= 0) return 0;
  return Math.round(((priceMinor - costMinor) / priceMinor) * 1000) / 10;
}
