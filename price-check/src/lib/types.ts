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

export function formatMoney(amountMinor: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}
