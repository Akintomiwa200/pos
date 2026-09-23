import type { CatalogItem } from "./types";
import { formatUnitLabel, inferUnitKind } from "./units";

export type ItemFamily = {
  /** Stable family id — the base item's id (`baseId` when the base is absent). */
  key: string;
  members: CatalogItem[];
  /** Default sellable member (the base / smallest unit). */
  base: CatalogItem;
};

export function familyKey(item: CatalogItem): string {
  return item.baseId ?? item.id;
}

/**
 * Collapse items that share a base product (packs / cartons set via `baseId`)
 * into a single family card. Order follows first appearance so existing sorts
 * keep working; members are ordered by pack size (base first).
 */
export function groupIntoFamilies(items: CatalogItem[]): ItemFamily[] {
  const seen = new Map<string, ItemFamily>();
  const order: ItemFamily[] = [];
  for (const item of items) {
    const key = familyKey(item);
    let family = seen.get(key);
    if (!family) {
      family = { key, members: [], base: item };
      seen.set(key, family);
      order.push(family);
    }
    family.members.push(item);
  }
  for (const family of order) {
    family.members.sort((a, b) => (a.packSize ?? 1) - (b.packSize ?? 1));
    family.base = family.members[0]!;
  }
  return order;
}

/** Chip label for a family member. The base unit reads "Pieces". */
export function memberLabel(item: CatalogItem): string {
  const size = item.packSize ?? 1;
  if (size <= 1) return "Pieces";
  const code = item.unit?.trim() || "each";
  const label = formatUnitLabel(code, item.unitLabel);
  const kind = inferUnitKind(code);
  if (kind === "composite") {
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} ×${size}`;
  }
  return `${size} ${label}`;
}