export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  sku: string;
  barcode: string;
  batchNumber?: string;
  brand?: string;
  productCode?: string;
  trackBatches?: boolean;
  baseId?: string;
  costMinor: number;
  priceMinor: number;
  /** Second pricing system. Branches that opt in to pricing system 2 use this. */
  branchPriceMinor?: number;
  /** The pricing system this item is actively sold under. Defaults to "main". */
  pricingSystem?: "main" | "branch";
  /** Resolved selling price for the active pricing system. Used live by tills & price-check. */
  effectivePriceMinor: number;
  currency: "NGN";
  image: string;
  onHand: number;
  reorderLevel: number;
  unit: string;
  unitLabel?: string;
  packSize: number;
  description?: string;
  active: boolean;
  updatedAt: string;
  expiresAt?: string;
  taxPercent?: number;
};