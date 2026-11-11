import { loadLocalSales } from "./sales";
import type { SaleReceipt } from "./receipt";
import type { StoreSettings } from "./store-settings";
import type { CartLine } from "./types";

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

/** Total value already refunded against an original ticket. */
export function refundedTotal(ticketId: string): number {
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
  _settings: StoreSettings,
) {
  if (!selected.length) return 0;
  const total = Math.abs(sale.totalMinor);
  const share = refundShare(sale, selected);
  const remainingValue = Math.max(0, total - refundedTotal(sale.ticketId));
  // Refund the same proportion of the original total (discount, service and
  // VAT included) that the selected lines represent. Cap at what is left so
  // repeated partial refunds can never pay back more than the ticket.
  return Math.min(remainingValue, Math.round(total * share));
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
