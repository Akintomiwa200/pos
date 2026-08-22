export type UnitKind = "count" | "weight" | "volume" | "composite";

const COMPOSITE_CODES = new Set([
  "pack",
  "packet",
  "pkt",
  "carton",
  "ctn",
  "bag",
  "dozen",
  "case",
  "bundle",
  "tray",
  "sachet",
  "roll",
]);

const WEIGHT_CODES = new Set(["kg", "g", "gram", "grams"]);
const VOLUME_CODES = new Set(["l", "ml", "litre", "liter", "ltr"]);

export function inferUnitKind(code?: string | null): UnitKind {
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return "count";
  if (COMPOSITE_CODES.has(c)) return "composite";
  if (WEIGHT_CODES.has(c)) return "weight";
  if (VOLUME_CODES.has(c)) return "volume";
  return "count";
}

export function formatUnitLabel(unitCode?: string | null, unitLabel?: string | null) {
  return unitLabel?.trim() || unitCode?.trim() || "each";
}

export function formatPricePer(unitCode?: string | null, unitLabel?: string | null) {
  return `per ${formatUnitLabel(unitCode, unitLabel).toLowerCase()}`;
}

export function formatStock(
  onHand: number,
  unitCode?: string | null,
  packSize = 1,
  unitLabel?: string | null,
) {
  const code = unitCode?.trim() || "each";
  const label = formatUnitLabel(code, unitLabel);
  const kind = inferUnitKind(code);
  if (kind === "composite" && packSize > 1) {
    return `${onHand} ${label} (${onHand * packSize} pcs)`;
  }
  return `${onHand} ${label}`;
}

export function formatLineQty(qty: number, unitCode?: string, unitLabel?: string) {
  const label = formatUnitLabel(unitCode ?? "each", unitLabel);
  return `${qty} ${label}`;
}
