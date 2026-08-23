export function marginPercent(costMinor: number, priceMinor: number) {
  if (priceMinor <= 0) return 0;
  return Math.round(((priceMinor - costMinor) / priceMinor) * 1000) / 10;
}

export function parseNairaInput(value: string) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function nairaInputFromMinor(minor: number) {
  return (minor / 100).toString();
}

/** Pack/carton barcodes use the same 890… range as the till catalog. */
export function suggestPackBarcode(existingBarcodes: string[]) {
  const set = new Set(existingBarcodes.map((code) => code.toLowerCase()).filter(Boolean));
  let seed = 8901234560000;
  for (const code of set) {
    const n = Number(code.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > seed) seed = n;
  }
  for (let i = 1; i < 100_000; i += 1) {
    const candidate = String(seed + i);
    if (!set.has(candidate)) return candidate;
  }
  return `890${Date.now()}`.slice(0, 13);
}

export const UNIT_OPTIONS = ["each", "kg", "g", "L", "ml", "pack", "carton", "dozen"] as const;
