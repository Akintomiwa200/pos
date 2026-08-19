export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  priceMinor: number;
  currency: string;
  image: string;
  onHand: number;
  updatedAt?: string;
};

export function formatMoney(amountMinor: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}
