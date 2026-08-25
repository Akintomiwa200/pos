import type { CartLine, TenderType } from "./types";
import { computeTotals, formatMoney } from "./types";
import { formatLineQty } from "./units";
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
  tillKey?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  loyaltyNumber?: string | null;
  loyaltyBalanceBefore?: number | null;
  loyaltyBalanceAfter?: number | null;
  loyaltyPointsEarned?: number | null;
  loyaltyPointsRedeemed?: number | null;
  loyaltyRedeemMinor?: number | null;
  giftCardCode?: string | null;
  giftCardChargedMinor?: number | null;
  giftCardBalanceAfterMinor?: number | null;
  amountTenderedMinor?: number | null;
  changeMinor?: number | null;
  discountMinor?: number | null;
};

function maskGiftCard(code: string) {
  const clean = code.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 2)}-····${clean.slice(-4)}`;
}

export function formatReceiptText(
  sale: SaleReceipt,
  settings: StoreSettings = loadStoreSettings(),
) {
  const lineSum = sale.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const totals = computeTotals(lineSum, settings);
  const till = findTill();
  const earned =
    sale.loyaltyPointsEarned ??
    (sale.loyaltyNumber ? loyaltyPointsEarned(sale.totalMinor, settings) : 0);
  const when = new Date(sale.paidAt);
  const showTicket = settings.receiptShowTicketNumber !== false;
  const showDate = settings.receiptShowDate !== false;

  const showTitle = settings.receiptShowTitle !== false;
  const showAddress = settings.receiptShowAddress !== false;
  const showEmail = settings.receiptShowEmail !== false;
  const showPhone = settings.receiptShowPhone !== false;
  const showHeader = settings.receiptShowHeader !== false;
  const showFooter = settings.receiptShowFooter !== false;
  const showDiscount = settings.receiptShowDiscount !== false;
  const showCustomerPhone = settings.receiptShowCustomerPhone !== false;
  const showLoyaltyBalance = settings.receiptShowLoyaltyBalance !== false;
  const showLoyaltyRedeemed = settings.receiptShowLoyaltyRedeemed !== false;
  const showLoyaltyEarned = settings.receiptShowLoyaltyEarned !== false;
  const showGiftBalance = settings.receiptShowGiftCardBalance !== false;

  const lines = [
    ...(showTitle ? [settings.storeName] : []),
    ...(showTitle &&
    settings.companyLegalName &&
    settings.companyLegalName !== settings.storeName
      ? [settings.companyLegalName]
      : []),
    ...(showAddress ? [settings.storeAddress] : []),
    ...(showPhone ? [settings.storePhone] : []),
    ...(showEmail ? [settings.storeEmail] : []),
    ...(settings.showTinOnReceipt ? [`TIN ${settings.storeTin}`] : []),
    ...(showHeader ? [settings.receiptHeader] : []),
    "--------------------------------",
    ...(showTicket ? [`Receipt # ${sale.ticketId}`] : []),
    ...(showDate
      ? [`${when.toLocaleDateString("en-NG")} ${when.toLocaleTimeString("en-NG")}`]
      : []),
    ...(settings.receiptShowCashier ? [`Cashier: ${sale.cashierName}`] : []),
    ...(settings.receiptShowTill && (sale.tillKey || till)
      ? [`Till: ${sale.tillKey || (till ? tillLabel(till) : "")}`]
      : []),
    ...(settings.receiptShowCustomer && sale.customerName
      ? [
          `Customer: ${sale.customerName}`,
          showCustomerPhone && sale.customerPhone
            ? `Phone: ${sale.customerPhone}`
            : "",
        ]
      : []),
    "--------------------------------",
    ...sale.lines.map(
      (line) =>
        `${line.name} ${formatLineQty(line.quantity, line.unit, line.unitLabel)}  ${formatMoney(line.unitPriceMinor * line.quantity)}`,
    ),
    "--------------------------------",
    `Subtotal     ${formatMoney(totals.subtotalMinor)}`,
    ...(showDiscount && sale.discountMinor && sale.discountMinor > 0
      ? [`Discount     -${formatMoney(sale.discountMinor)}`]
      : []),
    ...(settings.applyServiceCharge
      ? [`Service ${settings.servicePercent}%  ${formatMoney(totals.serviceMinor)}`]
      : []),
    ...(settings.includeVatBreakdown
      ? [`VAT ${settings.vatPercent}%     ${formatMoney(totals.vatMinor)}`]
      : []),
    ...(showLoyaltyRedeemed && sale.loyaltyRedeemMinor && sale.loyaltyRedeemMinor > 0
      ? [`Loyalty      -${formatMoney(sale.loyaltyRedeemMinor)}`]
      : []),
    `TOTAL        ${formatMoney(sale.totalMinor)}`,
    ...(settings.receiptShowTender
      ? [
          `Paid by ${TENDER_LABEL[sale.tender]}`,
          ...(sale.amountTenderedMinor != null
            ? [`Tendered     ${formatMoney(sale.amountTenderedMinor)}`]
            : []),
          ...(settings.receiptShowChange !== false && sale.changeMinor != null
            ? [`Change       ${formatMoney(sale.changeMinor)}`]
            : []),
        ]
      : [`Paid by ${TENDER_LABEL[sale.tender]}`]),
    ...(settings.receiptShowLoyalty && sale.loyaltyNumber
      ? [
          "--------------------------------",
          "Loyalty",
          `No. ${sale.loyaltyNumber}`,
          ...(showLoyaltyBalance && sale.loyaltyBalanceBefore != null
            ? [`Balance before ${sale.loyaltyBalanceBefore} pts`]
            : []),
          ...(showLoyaltyRedeemed &&
          sale.loyaltyPointsRedeemed &&
          sale.loyaltyPointsRedeemed > 0
            ? [`Points used  -${sale.loyaltyPointsRedeemed} pts`]
            : []),
          ...(showLoyaltyEarned && earned > 0
            ? [`Points earned +${earned} pts`]
            : []),
          ...(showLoyaltyBalance && sale.loyaltyBalanceAfter != null
            ? [`Balance after ${sale.loyaltyBalanceAfter} pts`]
            : showLoyaltyBalance && sale.loyaltyBalanceBefore != null
              ? [
                  `Balance after ${
                    sale.loyaltyBalanceBefore -
                    (sale.loyaltyPointsRedeemed ?? 0) +
                    earned
                  } pts`,
                ]
              : []),
        ]
      : []),
    ...(settings.receiptShowGiftCard && sale.giftCardCode
      ? [
          "--------------------------------",
          "Gift card",
          `Card ${maskGiftCard(sale.giftCardCode)}`,
          ...(sale.giftCardChargedMinor != null
            ? [`Charged      ${formatMoney(sale.giftCardChargedMinor)}`]
            : []),
          ...(showGiftBalance && sale.giftCardBalanceAfterMinor != null
            ? [`Balance left ${formatMoney(sale.giftCardBalanceAfterMinor)}`]
            : []),
        ]
      : []),
    ...(settings.receiptShowBarcode ? [`*${sale.ticketId}*`] : []),
    "--------------------------------",
    ...(showFooter ? [settings.receiptFooter] : []),
    ...(settings.receiptShowPoweredBy ? ["Powered by Herkintormiwer"] : []),
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
