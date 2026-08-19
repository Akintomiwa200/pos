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

export type HqTill = {
  id: string;
  name: string;
  code: string;
  branchName: string;
  active: boolean;
  hardwareHex: string | null;
  sessionToken: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
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

export const DEMO_TILL: HqTill = {
  id: "till-demo-01",
  name: "TILL-DEMO-01",
  code: "1111-2222-3333-4444",
  branchName: "Victoria Island",
  active: true,
  hardwareHex: null,
  sessionToken: null,
  pairedAt: null,
  lastSeenAt: null,
  subscriptionExpiresAt: null,
};

export const SEED_TILLS: HqTill[] = [
  DEMO_TILL,
  {
    id: "till-vi-01",
    name: "TILL-VI-01",
    code: "A7F3-19C0-B4E2-8D61",
    branchName: "Victoria Island",
    active: true,
    hardwareHex: null,
    sessionToken: null,
    pairedAt: null,
    lastSeenAt: null,
    subscriptionExpiresAt: null,
  },
];
