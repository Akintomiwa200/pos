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

export const UNIT_OPTIONS = ["each", "kg", "g", "L", "ml", "pack", "carton", "dozen"] as const;
