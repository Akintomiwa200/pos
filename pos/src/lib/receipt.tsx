import type { CartLine, TenderType } from "./types";
import { computeTotals, formatMoney } from "./types";
import { loadPrinterConfig, sendToPrinter } from "./printers";
import {
  loadStoreSettings,
  loyaltyPointsEarned,
  type StoreSettings,
} from "./store-settings";
import { findTill, tillLabel } from "./tills";

export const TENDER_LABEL: Record<TenderType, string> = {
  cash: "Cash",
  card: "Credit Card",
  transfer: "Transfer",
  wallet: "Wallet",
  split: "Split",
  room_charge: "Room charge",
};

export type SaleReceipt = {
  ticketId: string;
  paidAt: string;
  tender: TenderType;
  lines: CartLine[];
  totalMinor: number;
  cashierName: string;
  loyaltyNumber?: string | null;
  tillKey?: string | null;
};

export function formatReceiptText(
  sale: SaleReceipt,
  settings: StoreSettings = loadStoreSettings(),
) {
  const totals = computeTotals(
    sale.lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0),
    settings,
  );
  const till = findTill();
  const points = sale.loyaltyNumber
    ? loyaltyPointsEarned(sale.totalMinor, settings)
    : 0;
  const when = new Date(sale.paidAt);
  const lines = [
    settings.storeName,
    settings.companyLegalName && settings.companyLegalName !== settings.storeName
      ? settings.companyLegalName
      : "",
    settings.storeAddress,
    settings.storePhone,
    settings.storeEmail,
    ...(settings.showTinOnReceipt ? [`TIN ${settings.storeTin}`] : []),
    settings.receiptHeader,
    "--------------------------------",
    `Ticket ${sale.ticketId}`,
    `${when.toLocaleDateString("en-NG")} ${when.toLocaleTimeString("en-NG")}`,
    ...(settings.receiptShowCashier ? [`Cashier: ${sale.cashierName}`] : []),
    ...(till ? [`Till: ${tillLabel(till)}`] : []),
    `Paper ${settings.receiptPaper}`,
    "--------------------------------",
    ...sale.lines.map(
      (line) =>
        `${line.name} x${line.quantity}  ${formatMoney(line.unitPriceMinor * line.quantity)}`,
    ),
    "--------------------------------",
    `Subtotal     ${formatMoney(totals.subtotalMinor)}`,
    ...(settings.applyServiceCharge
      ? [`Service ${settings.servicePercent}%  ${formatMoney(totals.serviceMinor)}`]
      : []),
    ...(settings.includeVatBreakdown
      ? [`VAT ${settings.vatPercent}%     ${formatMoney(totals.vatMinor)}`]
      : []),
    `TOTAL        ${formatMoney(sale.totalMinor)}`,
    `Paid by ${TENDER_LABEL[sale.tender]}`,
    ...(sale.loyaltyNumber
      ? [
          `Loyalty ${sale.loyaltyNumber}`,
          points > 0 ? `Points earned ${points}` : "",
        ]
      : []),
    ...(settings.receiptShowBarcode ? [`*${sale.ticketId}*`] : []),
    "--------------------------------",
    settings.receiptFooter,
    "",
  ].filter((line) => line !== "");
  return lines.join("\n");
}

export async function printReceipt(sale: SaleReceipt) {
  const config = loadPrinterConfig();
  if (!config.receiptPrinter) {
    throw new Error("No receipt printer in Settings.");
  }
  const settings = loadStoreSettings();
  const copies = Math.max(1, settings.receiptCopies);
  const text = formatReceiptText(sale, settings);
  for (let i = 0; i < copies; i += 1) {
    await sendToPrinter(config.receiptPrinter, text);
  }
  return config.receiptPrinter;
}
