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
  branchPriceMinor?: number;
  pricingSystem?: "main" | "branch";
  /** Resolved selling price for the active pricing system. Prefer this when present. */
  effectivePriceMinor?: number;
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
  /** Per-product VAT percent. Unset = store default; 0 = VAT-exempt. */
  taxPercent?: number;
};

/** Live selling price for a product: the resolved effective price, else the main price. */
export function sellPrice(item: CatalogItem): number {
  return item.effectivePriceMinor ?? item.priceMinor;
}

export type CartLine = {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  image: string;
  sku?: string;
  unit?: string;
  unitLabel?: string;
  packSize?: number;
  /** VAT rate snapshot at add time. Unset = store default; 0 = exempt. */
  taxPercent?: number;
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

export type VatSlice = {
  ratePercent: number;
  netMinor: number;
  taxMinor: number;
};

export type Totals = {
  subtotalMinor: number;
  discountMinor: number;
  serviceMinor: number;
  vatMinor: number;
  totalMinor: number;
  vatSlices: VatSlice[];
  exemptMinor: number;
};

function vatNet(grossMinor: number, ratePercent: number, inclusive: boolean) {
  return inclusive
    ? Math.round((grossMinor * 100) / (100 + ratePercent))
    : grossMinor;
}

export function computeLineTotals(
  lines: Pick<CartLine, "unitPriceMinor" | "quantity" | "taxPercent">[],
  settings: StoreSettings = loadStoreSettings(),
): Totals {
  const { vatPercent, servicePercent, pricesIncludeVat, applyServiceCharge } =
    settings;
  const applyVat = settings.applyVat !== false;

  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const serviceMinor = applyServiceCharge
    ? Math.round((subtotalMinor * servicePercent) / 100)
    : 0;

  // Bucket taxable line value (gross) by effective VAT rate. Rate 0 → exempt.
  const buckets = new Map<number, number>();
  let exemptMinor = 0;
  for (const line of lines) {
    const gross = line.unitPriceMinor * line.quantity;
    if (!gross) continue;
    const rate = applyVat
      ? typeof line.taxPercent === "number"
        ? line.taxPercent
        : vatPercent
      : 0;
    if (rate <= 0) {
      exemptMinor += gross;
      continue;
    }
    buckets.set(rate, (buckets.get(rate) ?? 0) + gross);
  }

  const entries = [...buckets.entries()];
  const vatableTotal = entries.reduce((sum, [, gross]) => sum + gross, 0);
  // Only the vatable share of the service charge joins the taxable base, so
  // exempt goods do not drag VAT onto their service.
  const serviceVatable =
    applyServiceCharge &&
    !pricesIncludeVat &&
    vatableTotal > 0 &&
    subtotalMinor > 0
      ? Math.round((vatableTotal / subtotalMinor) * serviceMinor)
      : 0;
  const vatSlices: VatSlice[] = [];
  for (const [rate, gross] of entries) {
    const netMinor = vatNet(gross, rate, pricesIncludeVat);
    const serviceBase =
      vatableTotal > 0 ? Math.round((gross / vatableTotal) * serviceVatable) : 0;
    const taxMinor =
      Math.round((netMinor * rate) / 100) +
      Math.round((serviceBase * rate) / 100);
    vatSlices.push({ ratePercent: rate, netMinor, taxMinor });
  }
  // A single rate with no exempt lines keeps the exact legacy single-rate
  // rounding (service fully vatable).
  if (entries.length === 1 && exemptMinor === 0) {
    const [rate, gross] = entries[0]!;
    const netMinor = vatNet(gross, rate, pricesIncludeVat);
    const vatMinor = pricesIncludeVat
      ? gross - netMinor
      : Math.round(((gross + serviceMinor) * rate) / 100);
    vatSlices[0] = { ratePercent: rate, netMinor, taxMinor: vatMinor };
  }

  const vatMinor = vatSlices.reduce((sum, slice) => sum + slice.taxMinor, 0);
  const totalMinor = pricesIncludeVat
    ? subtotalMinor + serviceMinor
    : subtotalMinor + serviceMinor + vatMinor;

  return {
    subtotalMinor,
    discountMinor: 0,
    serviceMinor,
    vatMinor,
    totalMinor,
    vatSlices,
    exemptMinor,
  };
}

export function computeTotals(
  subtotalMinor: number,
  settings: StoreSettings = loadStoreSettings(),
): Totals {
  return computeLineTotals(
    [{ unitPriceMinor: subtotalMinor, quantity: 1 }],
    settings,
  );
}
