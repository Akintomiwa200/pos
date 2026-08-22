import { loadStoreSettings, type StoreSettings } from "./store-settings";

export type TenderType =
  | "cash"
  | "card"
  | "transfer"
  | "wallet"
  | "split"
  | "room_charge";

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
  description?: string;
  active?: boolean;
  updatedAt?: string;
  expiresAt?: string;
};

export type CartLine = {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  image: string;
  unit?: string;
  unitLabel?: string;
  packSize?: number;
};

export const VAT_BPS = 750;
export const SERVICE_BPS = 1000;

export function formatMoney(amountMinor: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function computeTotals(
  subtotalMinor: number,
  settings: StoreSettings = loadStoreSettings(),
) {
  const { vatPercent, servicePercent, applyServiceCharge, pricesIncludeVat } =
    settings;
  const serviceMinor = applyServiceCharge
    ? Math.round((subtotalMinor * servicePercent) / 100)
    : 0;
  const vatMinor = pricesIncludeVat
    ? Math.round((subtotalMinor * vatPercent) / (100 + vatPercent))
    : Math.round(((subtotalMinor + serviceMinor) * vatPercent) / 100);
  const totalMinor = pricesIncludeVat
    ? subtotalMinor + serviceMinor
    : subtotalMinor + serviceMinor + vatMinor;
  return {
    subtotalMinor,
    discountMinor: 0,
    serviceMinor,
    vatMinor,
    totalMinor,
  };
}
