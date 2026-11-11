import type { CartLine } from "./types";

export type HeldTicket = {
  id: string;
  /** Customer or ticket label given when parking the order. */
  name: string;
  note: string;
  lines: CartLine[];
  discountMinor: number;
  createdAt: string;
  /** Null when the store disables hold expiry. */
  expiresAt: string | null;
  tillKey: string;
  cashierName: string;
};

const KEY = "pos.holds.v1";

export function loadLocalHolds(): HeldTicket[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HeldTicket[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row) =>
        row &&
        typeof row.id === "string" &&
        Array.isArray(row.lines) &&
        row.lines.length > 0,
    );
  } catch {
    return [];
  }
}

export function saveLocalHolds(rows: HeldTicket[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* storage full — keep the in-memory copy */
  }
}

export function createHeldTicket(input: {
  name: string;
  note?: string;
  lines: CartLine[];
  discountMinor?: number;
  holdExpiryMinutes: number;
  tillKey: string;
  cashierName: string;
}): HeldTicket {
  const now = new Date();
  const minutes = Math.max(0, Math.round(input.holdExpiryMinutes));
  return {
    id: crypto.randomUUID(),
    name: input.name.trim() || "Walk-in",
    note: (input.note ?? "").trim(),
    lines: input.lines,
    discountMinor: Math.max(0, Math.round(input.discountMinor ?? 0)),
    createdAt: now.toISOString(),
    expiresAt: minutes
      ? new Date(now.getTime() + minutes * 60_000).toISOString()
      : null,
    tillKey: input.tillKey,
    cashierName: input.cashierName,
  };
}

export function holdIsExpired(hold: HeldTicket, now = Date.now()) {
  return Boolean(hold.expiresAt && new Date(hold.expiresAt).getTime() <= now);
}

export function holdMinutesLeft(hold: HeldTicket, now = Date.now()) {
  if (!hold.expiresAt) return null;
  return Math.max(
    0,
    Math.ceil((new Date(hold.expiresAt).getTime() - now) / 60_000),
  );
}

export function pruneExpiredHolds(holds: HeldTicket[], now = Date.now()) {
  return holds.filter((hold) => !holdIsExpired(hold, now));
}
