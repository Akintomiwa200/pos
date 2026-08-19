export function normalizeTillCode(raw: string) {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, 16);
  return (hex.match(/.{1,4}/g) ?? []).join("-");
}

export function isCompleteTillCode(value: string) {
  return /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(
    normalizeTillCode(value),
  );
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
