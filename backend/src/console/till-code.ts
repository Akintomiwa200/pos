import { randomBytes } from "node:crypto";

export function normalizeTillCode(raw: string) {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, 16);
  return (hex.match(/.{1,4}/g) ?? []).join("-");
}

export function isCompleteTillCode(value: string) {
  return /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(
    normalizeTillCode(value),
  );
}

export function generateTillCode() {
  return normalizeTillCode(randomBytes(8).toString("hex"));
}

export type TillProduct = "supermarket" | "hotel" | "restaurant" | "dark-kitchen";

export const TILL_PRODUCTS: { id: TillProduct; label: string }[] = [
  { id: "supermarket", label: "Supermarket" },
  { id: "hotel", label: "Hotel" },
  { id: "restaurant", label: "Restaurant" },
  { id: "dark-kitchen", label: "Dark kitchen" },
];

export function normalizeTillProduct(value?: string | null): TillProduct {
  if (value === "hotel" || value === "restaurant" || value === "dark-kitchen") {
    return value;
  }
  return "supermarket";
}

export function tillProductLabel(value?: string | null) {
  const id = normalizeTillProduct(value);
  return TILL_PRODUCTS.find((row) => row.id === id)?.label ?? "Supermarket";
}

export type HqTill = {
  id: string;
  name: string;
  code: string;
  branchName: string;
  branchId?: string;
  storeId?: string;
  product: TillProduct;
  active: boolean;
  hardwareHex: string | null;
  sessionToken: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  unpairedAt: string | null;
  subscriptionExpiresAt: string | null;
};

export function generateSessionToken() {
  return randomBytes(24).toString("hex");
}

export function addOneYear(from = new Date()) {
  const next = new Date(from);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

export function isSubscriptionExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const at = Date.parse(expiresAt);
  return !Number.isFinite(at) || at <= Date.now();
}
