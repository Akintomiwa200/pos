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
  branchPriceMinor?: number;
  pricingSystem?: "main" | "branch";
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

/** Live selling price for a product: the resolved effective price, else the main price. */
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
