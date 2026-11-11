import { loadLocalSales } from "./sales";
import type { SaleReceipt } from "./receipt";
import type { StoreSettings } from "./store-settings";
import { computeLineTotals, type CartLine } from "./types";

/** Quantities already returned for an original ticket, keyed by cart line id. */
export function refundedQuantities(ticketId: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const sale of loadLocalSales()) {
    if (sale.kind !== "refund" || sale.refundOf !== ticketId) continue;
    for (const line of sale.lines) {
      totals.set(line.id, (totals.get(line.id) ?? 0) + line.quantity);
    }
  }
  return totals;
}

function alreadyRefundedMinor(ticketId: string) {
  return loadLocalSales()
    .filter((sale) => sale.kind === "refund" && sale.refundOf === ticketId)
    .reduce((sum, sale) => sum + Math.abs(sale.totalMinor), 0);
}

export function remainingRefundLines(sale: SaleReceipt): CartLine[] {
  if (sale.kind === "refund") return [];
  const already = refundedQuantities(sale.ticketId);
  return sale.lines
    .map((line) => {
      const remaining = Math.max(
        0,
        line.quantity - (already.get(line.id) ?? 0),
      );
      return remaining ? { ...line, quantity: remaining } : null;
    })
    .filter((line): line is CartLine => Boolean(line));
}

export function refundShare(sale: SaleReceipt, selected: CartLine[]) {
  const originalSubtotal = sale.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  if (originalSubtotal <= 0) return 0;
  const selectedSubtotal = selected.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  return Math.max(0, Math.min(1, selectedSubtotal / originalSubtotal));
}

export function refundedDiscount(sale: SaleReceipt, selected: CartLine[]) {
  return Math.round((sale.discountMinor ?? 0) * refundShare(sale, selected));
}

/** Positive amount the customer gets back for the selected lines. */
export function refundAmount(
  sale: SaleReceipt,
  selected: CartLine[],
  settings: StoreSettings,
) {
  if (!selected.length) return 0;
  const remaining = remainingRefundLines(sale);
  const fullSubtotal = remaining.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const selectedSubtotal = selected.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  if (selectedSubtotal >= fullSubtotal) {
    return Math.max(0, Math.abs(sale.totalMinor) - alreadyRefundedMinor(sale.ticketId));
  }
  return computeLineTotals(
    selected,
    settings,
    refundedDiscount(sale, selected),
  ).totalMinor;
}

export function buildRefundSale(input: {
  original: SaleReceipt;
  selected: CartLine[];
  settings: StoreSettings;
  ticketId: string;
  cashierName: string;
  refundedBy: string;
  reason: string;
}): SaleReceipt {
  const { original, selected, settings, ticketId, cashierName, refundedBy } =
    input;
  const amount = refundAmount(original, selected, settings);
  return {
    ticketId,
    paidAt: new Date().toISOString(),
    lines: selected,
    totalMinor: -amount,
    tender: original.tender,
    cashierName,
    tillKey: original.tillKey ?? null,
    customerName: original.customerName ?? null,
    customerPhone: original.customerPhone ?? null,
    loyaltyNumber: original.loyaltyNumber ?? null,
    discountMinor: refundedDiscount(original, selected),
    kind: "refund",
    refundOf: original.ticketId,
    refundReason: input.reason.trim() || null,
    refundedBy,
  };
}
