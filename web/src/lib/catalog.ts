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

/**
 * Resolve the effective selling price (in minor units) from a product draft.
 * In "margin" mode the selling price is derived from cost via margin (%) = (price - cost) / price,
 * i.e. price = cost / (1 - margin/100). Otherwise the entered selling price is used directly.
 */
export function resolveSellPriceMinor(
  opts: {
    pricingMode?: "direct" | "margin";
    costMinor: number;
    priceMinor: number;
    marginInput?: string;
  },
) {
  if (opts.pricingMode === "margin") {
    const pct = parseFloat(opts.marginInput ?? "");
    if (!Number.isFinite(pct) || pct >= 100) return 0;
    const safe = Math.max(-9999, Math.min(99.9, pct));
    return Math.max(0, Math.round(opts.costMinor / (1 - safe / 100)));
  }
  return Math.max(0, opts.priceMinor);
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

/** Standard EAN-13 check digit for the first 12 digits. */
export function ean13CheckDigit(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 12);
  if (d.length !== 12) return -1;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string) {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 13) return false;
  return ean13CheckDigit(digits.slice(0, 12)) === Number(digits[12]);
}

/**
 * Generate a scannable EAN-13 barcode in the 890… till range that is not already
 * used by the catalog. The check digit is computed so printed labels scan.
 */
export function makeValidBarcode(existingBarcodes: string[]) {
  const used = new Set(existingBarcodes.map((code) => code.toLowerCase()).filter(Boolean));
  const seed = 890123456000;
  for (let base = seed; base < seed + 1_000_000; base += 1) {
    const digits = String(base);
    const check = ean13CheckDigit(digits);
    if (check < 0) continue;
    const code = `${digits}${check}`;
    if (!used.has(code)) return code;
  }
  return "";
}

export const UNIT_OPTIONS = ["each", "kg", "g", "L", "ml", "pack", "carton", "dozen"] as const;
