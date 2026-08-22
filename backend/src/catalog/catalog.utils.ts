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

export function normalizeCatalogItem(raw: Partial<CatalogItem> & Pick<CatalogItem, "id" | "name">): CatalogItem {
  const costMinor =
    typeof raw.costMinor === "number" && Number.isFinite(raw.costMinor)
      ? Math.max(0, Math.round(raw.costMinor))
      : 0;
  const priceMinor =
    typeof raw.priceMinor === "number" && Number.isFinite(raw.priceMinor)
      ? Math.max(0, Math.round(raw.priceMinor))
      : 0;
  const onHand =
    typeof raw.onHand === "number" && Number.isFinite(raw.onHand)
      ? Math.max(0, Math.round(raw.onHand))
      : 0;
  const reorderLevel =
    typeof raw.reorderLevel === "number" && Number.isFinite(raw.reorderLevel)
      ? Math.max(0, Math.round(raw.reorderLevel))
      : 0;

  return {
    id: raw.id,
    name: raw.name.trim(),
    category: raw.category?.trim() || "General",
    subcategory: raw.subcategory?.trim() || undefined,
    sku: raw.sku?.trim() || slugFromName(raw.name) || raw.id,
    barcode: raw.barcode?.trim() || "",
    batchNumber: raw.batchNumber?.trim() || undefined,
    costMinor,
    priceMinor,
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
  };
}

export function marginPercent(costMinor: number, priceMinor: number) {
  if (priceMinor <= 0) return 0;
  return Math.round(((priceMinor - costMinor) / priceMinor) * 1000) / 10;
}
