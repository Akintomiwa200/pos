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

export function inferUnitKind(code?: string | null, kind?: string | null): UnitKind {
  if (kind === "count" || kind === "weight" || kind === "volume" || kind === "composite") {
    return kind;
  }
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return "count";
  if (COMPOSITE_CODES.has(c)) return "composite";
  if (WEIGHT_CODES.has(c)) return "weight";
  if (VOLUME_CODES.has(c)) return "volume";
  return "count";
}

export function unitKindLabel(kind: UnitKind) {
  if (kind === "composite") return "Pack / carton / bag";
  if (kind === "weight") return "Weight";
  if (kind === "volume") return "Volume";
  return "Single item";
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
  kind?: UnitKind,
) {
  const code = unitCode?.trim() || "each";
  const label = formatUnitLabel(code, unitLabel);
  const unitKind = kind ?? inferUnitKind(code);
  const qty = onHand;
  if (unitKind === "composite" && packSize > 1) {
    const pieces = onHand * packSize;
    return `${qty} ${label} (${pieces} pcs)`;
  }
  if (unitKind === "weight" || unitKind === "volume") {
    return `${qty} ${label}`;
  }
  return `${qty} ${qty === 1 ? label : `${label}s`}`;
}

export function formatQuantityStep(kind: UnitKind) {
  if (kind === "weight" || kind === "volume") return 0.01;
  return 1;
}

export function allowsDecimalQty(kind: UnitKind) {
  return kind === "weight" || kind === "volume";
}

export function formatMovementQty(
  qty: number,
  unitCode?: string,
  unitLabel?: string,
) {
  const signed = qty > 0 ? `+${qty}` : String(qty);
  const label = formatUnitLabel(unitCode ?? "each", unitLabel);
  return `${signed} ${label}`;
}

export function formatLineQty(qty: number, unitCode?: string, unitLabel?: string) {
  const label = formatUnitLabel(unitCode ?? "each", unitLabel);
  return `${qty} ${label}`;
}
