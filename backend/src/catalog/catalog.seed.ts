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
  /**
   * Per-branch selling prices keyed by branch id. A branch without an entry
   * falls back to `priceMinor`. Tills resolve this via their own branch id.
   */
  branchPrices?: Record<string, number>;
  /** Resolved selling price for branchless consumers (base price). */
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