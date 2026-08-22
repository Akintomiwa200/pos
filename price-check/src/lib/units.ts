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

export function inferUnitKind(code?: string | null): UnitKind {
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return "count";
  if (COMPOSITE_CODES.has(c)) return "composite";
  if (["kg", "g"].includes(c)) return "weight";
  if (["l", "ml"].includes(c)) return "volume";
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
  if (inferUnitKind(code) === "composite" && packSize > 1) {
    return `${onHand} ${label} (${onHand * packSize} pcs)`;
  }
  return `${onHand} ${label}`;
}
