import { apiUrl } from "./api-base";

export type PromotionRecord = {
  id: string;
  name: string;
  active: boolean;
  note?: string;
  extra?: Record<string, string | number | boolean | null>;
};

export type AppliedPromotion = {
  id: string;
  name: string;
  discountMinor: number;
};

function majorToMinor(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

/** HQ campaigns are fetched from the live directory; failures simply mean no campaign applies. */
export async function loadPromotions(): Promise<PromotionRecord[]> {
  try {
    const response = await fetch(apiUrl("/api/directory/promotions"), {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const rows: unknown = await response.json();
    return Array.isArray(rows) ? (rows as PromotionRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Pick the single best eligible campaign for the whole ticket.
 * Only "all items" campaigns are evaluated; item-specific rules remain HQ reference notes
 * because no item IDs are attached to those records.
 */
export function bestPromotion(
  rows: PromotionRecord[],
  subtotalMinor: number,
  now = new Date(),
): AppliedPromotion | null {
  if (subtotalMinor <= 0) return null;
  const today = now.toISOString().slice(0, 10);
  let best: AppliedPromotion | null = null;

  for (const row of rows) {
    if (!row.active) continue;
    const extra = row.extra ?? {};
    const type = String(extra.type ?? "").toLowerCase();
    if (type !== "percent" && type !== "fixed") continue;
    if (extra.appliesTo && extra.appliesTo !== "all") continue;

    const from = String(extra.validFrom ?? "");
    const to = String(extra.validTo ?? "");
    if (from && from > today) continue;
    if (to && to < today) continue;

    const minimum = majorToMinor(extra.minOrder);
    if (minimum > subtotalMinor) continue;

    const value = Number(extra.value);
    if (!Number.isFinite(value) || value <= 0) continue;

    let discount =
      type === "percent"
        ? Math.round((subtotalMinor * Math.min(value, 100)) / 100)
        : majorToMinor(value);
    const cap = majorToMinor(extra.maxDiscount);
    if (cap > 0) discount = Math.min(discount, cap);
    discount = Math.min(subtotalMinor, Math.max(0, discount));
    if (discount <= 0) continue;

    if (!best || discount > best.discountMinor) {
      best = { id: row.id, name: row.name, discountMinor: discount };
    }
  }
  return best;
}
