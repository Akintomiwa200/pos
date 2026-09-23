export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  batchNumber?: string;
  subcategory?: string;
  costMinor?: number;
  priceMinor: number;
  /** Per-branch prices; a price-check has no branch context, so it reads base. */
  branchPrices?: Record<string, number>;
  effectivePriceMinor?: number;
  currency: string;
  image: string;
  onHand: number;
  reorderLevel?: number;
  unit?: string;
  unitLabel?: string;
  packSize?: number;
  active?: boolean;
  updatedAt?: string;
  expiresAt?: string;
};

/** Base selling price; branch overrides need a till with a branch context. */
export function sellPrice(item: CatalogItem): number {
  return item.effectivePriceMinor ?? item.priceMinor;
}

export function formatMoney(amountMinor: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}
