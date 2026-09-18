import type { CartLine, TenderType } from "./types";
import { computeTotals, formatMoney } from "./types";
import { formatLineQty } from "./units";
import {
  loadPrinterConfig,
  sendReceiptLayout,
  type ReceiptRichLine,
} from "./printers";
import { overlayReceiptIdentity } from "./receipt-identity";
import {
  loadStoreSettings,
  loyaltyPointsEarned,
  type StoreSettings,
} from "./store-settings";
import { findTill, tillLabel } from "./tills";
import JsBarcode from "jsbarcode";

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
  settings: StoreSettings = overlayReceiptIdentity(loadStoreSettings()),
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
  const money = (n: number) => formatMoney(n, settings.currency || "NGN");
  const when = new Date(sale.paidAt);
  const showTicket = settings.receiptShowTicketNumber !== false;
  const showDate = settings.receiptShowDate !== false;

  const isMinimal = settings.receiptTemplate === "minimal";
  const showTitle = settings.receiptShowTitle !== false;
  const showAddress = !isMinimal && settings.receiptShowAddress !== false;
  const showEmail = !isMinimal && settings.receiptShowEmail !== false;
  const showPhone = !isMinimal && settings.receiptShowPhone !== false;
  const showHeader = settings.receiptShowHeader !== false;
  const showFooter = settings.receiptShowFooter !== false;
  const showDiscount = settings.receiptShowDiscount !== false;
  const showTax = settings.receiptShowTax !== false;
  const showCustomerPhone = settings.receiptShowCustomerPhone !== false;
  const showLoyaltyBalance = settings.receiptShowLoyaltyBalance !== false;
  const showLoyaltyRedeemed = settings.receiptShowLoyaltyRedeemed !== false;
  const showLoyaltyEarned = settings.receiptShowLoyaltyEarned !== false;
  const showGiftBalance = settings.receiptShowGiftCardBalance !== false;
  const showChange = settings.receiptShowChange !== false;

  const lines = [
    ...(showTitle ? [settings.storeName] : []),
    ...(settings.receiptLocation &&
    settings.receiptLocation !== settings.storeName &&
    (showTitle || showAddress)
      ? [settings.receiptLocation]
      : []),
    ...(showAddress ? [settings.storeAddress] : []),
    ...(showEmail ? [settings.storeEmail] : []),
    ...(showPhone ? [settings.storePhone] : []),
    ...(showHeader ? [settings.receiptHeader] : []),
    "--------------------------------",
    ...(showTicket ? [`Receipt # ${sale.ticketId}`] : []),
    ...(showDate
      ? [`${when.toLocaleDateString("en-GB")} ${when.toLocaleTimeString("en-GB", { hour12: false })}`]
      : []),
    ...(settings.receiptShowCashier ? [`Cashier: ${sale.cashierName}`] : []),
    ...(settings.receiptShowTill && (sale.tillKey || till)
      ? [`Till: ${sale.tillKey || (till ? tillLabel(till) : "")}`]
      : []),
    ...(settings.receiptShowCustomer && (sale.customerName || sale.customerPhone)
      ? [
          sale.customerName ? `Customer: ${sale.customerName}` : "",
          showCustomerPhone && sale.customerPhone
            ? `Phone: ${sale.customerPhone}`
            : "",
        ]
      : []),
    "--------------------------------",
    ...sale.lines.flatMap((line) => {
      const lineTotal = money(line.unitPriceMinor * line.quantity);
      const skuBit =
        settings.showSkuOnReceipt && line.sku ? ` · ${line.sku}` : "";
      const nameLine = `${line.name}${skuBit}   ${lineTotal}`;
      const qtyStr = formatLineQty(line.quantity, line.unit, line.unitLabel);
      const qtyLine = `  ${qtyStr} x ${money(line.unitPriceMinor)}`;
      return [nameLine, qtyLine];
    }),
    "--------------------------------",
    `Subtotal     ${money(totals.subtotalMinor)}`,
    ...(showDiscount && sale.discountMinor && sale.discountMinor > 0
      ? [`Discount     -${money(sale.discountMinor)}`]
      : []),
    ...(showTax && settings.applyServiceCharge
      ? [`Service ${settings.servicePercent}%  ${money(totals.serviceMinor)}`]
      : []),
    ...(showTax ? [`VAT ${settings.vatPercent}%     ${money(totals.vatMinor)}`] : []),
    ...(showLoyaltyRedeemed && sale.loyaltyRedeemMinor && sale.loyaltyRedeemMinor > 0
      ? [`Loyalty      -${money(sale.loyaltyRedeemMinor)}`]
      : []),
    `TOTAL        ${money(sale.totalMinor)}`,
    ...(settings.receiptShowTender
      ? [
          `Paid by ${TENDER_LABEL[sale.tender]}`,
          ...(sale.amountTenderedMinor != null
            ? [`Tendered     ${money(sale.amountTenderedMinor)}`]
            : []),
          ...(showChange && sale.changeMinor != null
            ? [`Change       ${money(sale.changeMinor)}`]
            : []),
        ]
      : []),
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
            ? [`Charged      ${money(sale.giftCardChargedMinor)}`]
            : []),
          ...(showGiftBalance && sale.giftCardBalanceAfterMinor != null
            ? [`Balance left ${money(sale.giftCardBalanceAfterMinor)}`]
            : []),
        ]
      : []),
    "--------------------------------",
    ...(showFooter ? [settings.receiptFooter] : []),
    ...(settings.receiptShowBarcode ? [`*${sale.ticketId}*`] : []),
    ...(settings.receiptShowPoweredBy ? ["Powered by Herkintormiwer"] : []),
    "",
  ].filter((line) => line !== "");
  return lines.join("\n");
}

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Builds the printed receipt as a list of primitive text/Dash/image lines that
 * mirror the on-screen ReceiptVisual. The backend renders these natively with
 * GDI+ DrawString, so the text is always printing at the printer's native
 * resolution — pixel-crisp, never blurred by raster re-sampling.
 */
export function buildReceiptLayout(
  sale: SaleReceipt,
  settings: StoreSettings,
): ReceiptRichLine[] {
  const out: ReceiptRichLine[] = [];
  const widthMm = settings.receiptPaper === "58mm" ? 58 : 80;
  const subtotal = sale.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const totals = computeTotals(subtotal, settings);
  const till = findTill();
  const earned =
    sale.loyaltyPointsEarned ??
    (sale.loyaltyNumber ? loyaltyPointsEarned(sale.totalMinor, settings) : 0);
  const money = (n: number) => formatMoney(n, settings.currency || "NGN");
  const when = new Date(sale.paidAt);

  const isMinimal = settings.receiptTemplate === "minimal";
  const bold = settings.receiptTemplate === "bold";
  const title = settings.storeName.trim() || "Your store";
  const showTitle = settings.receiptShowTitle !== false;
  const showAddress = !isMinimal && settings.receiptShowAddress !== false;
  const showEmail = !isMinimal && settings.receiptShowEmail !== false;
  const showPhone = !isMinimal && settings.receiptShowPhone !== false;
  const showHeader = settings.receiptShowHeader !== false;
  const showFooter = settings.receiptShowFooter !== false;
  const showDiscount = settings.receiptShowDiscount !== false;
  const showTax = settings.receiptShowTax !== false;
  const showChange = settings.receiptShowChange !== false;
  const showCustomerPhone = settings.receiptShowCustomerPhone !== false;
  const showLoyaltyBalance = settings.receiptShowLoyaltyBalance !== false;
  const showLoyaltyRedeemed = settings.receiptShowLoyaltyRedeemed !== false;
  const showLoyaltyEarned = settings.receiptShowLoyaltyEarned !== false;
  const showGiftBalance = settings.receiptShowGiftCardBalance !== false;

  // Consolas at 10pt ≈ 5.8pt per character; the backend clips any single line
  // longer than the paper, so split long centered text client-side to mimic the
  // preview's wrapping behaviour.
  const maxChars = widthMm === 58 ? 26 : 38;
  const centered = (text: string, opts: { bold?: boolean } = {}) => {
    const chunks = text.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [text];
    for (const chunk of chunks) out.push({ t: "c", text: chunk, ...opts });
  };

  if (settings.receiptShowLogo) {
    out.push({ t: "c", text: initialsOf(title), bold: true });
  }
  if (showTitle) {
    centered(bold ? title.toUpperCase() : title, { bold });
  }
  if (
    settings.receiptLocation &&
    settings.receiptLocation !== title &&
    (showTitle || showAddress)
  ) {
    centered(settings.receiptLocation);
  }
  if (showAddress && settings.storeAddress) {
    centered(settings.storeAddress);
  }
  if (showEmail && settings.storeEmail) {
    centered(settings.storeEmail);
  }
  if (showPhone && settings.storePhone) {
    centered(settings.storePhone);
  }
  if (showHeader && settings.receiptHeader) {
    out.push({ t: "s", h: 2 });
    out.push({ t: "d" });
    centered(settings.receiptHeader);
    out.push({ t: "d" });
    out.push({ t: "s", h: 2 });
  }

  out.push({ t: "d" });

  if (settings.receiptShowTicketNumber !== false) {
    out.push({ t: "r", l: "Receipt #", r: sale.ticketId, bold: true });
  }
  if (settings.receiptShowDate !== false) {
    out.push({
      t: "r",
      l: "Date",
      r: `${when.toLocaleDateString("en-GB")} ${when.toLocaleTimeString("en-GB", { hour12: false })}`,
      gray: true,
    });
  }
  if (settings.receiptShowCashier) {
    out.push({ t: "r", l: "Cashier", r: sale.cashierName, gray: true });
  }
  if (settings.receiptShowTill && (sale.tillKey || till)) {
    out.push({
      t: "r",
      l: "Till",
      r: sale.tillKey || (till ? tillLabel(till) : ""),
      gray: true,
    });
  }

  if (settings.receiptShowCustomer && (sale.customerName || sale.customerPhone)) {
    out.push({ t: "d" });
    if (sale.customerName) {
      out.push({ t: "r", l: "Customer", r: sale.customerName, bold: true });
    }
    if (showCustomerPhone && sale.customerPhone) {
      out.push({ t: "r", l: "Phone", r: sale.customerPhone, gray: true });
    }
  }

  out.push({ t: "d" });

  for (const line of sale.lines) {
    const skuBit = settings.showSkuOnReceipt && line.sku ? ` · ${line.sku}` : "";
    out.push({ t: "r", l: line.name + skuBit, r: money(line.unitPriceMinor * line.quantity) });
    out.push({
      t: "r",
      l: `${formatLineQty(line.quantity, line.unit, line.unitLabel)} x ${money(line.unitPriceMinor)}`,
      r: "",
      gray: true,
    });
    out.push({ t: "s", h: 2 });
  }

  out.push({ t: "d" });

  out.push({ t: "r", l: "Subtotal", r: money(totals.subtotalMinor) });
  if (showDiscount && sale.discountMinor && sale.discountMinor > 0) {
    out.push({ t: "r", l: "Discount", r: `-${money(sale.discountMinor)}`, gray: true });
  }
  if (showTax && settings.applyServiceCharge && totals.serviceMinor > 0) {
    out.push({ t: "r", l: `Service ${settings.servicePercent}%`, r: money(totals.serviceMinor), gray: true });
  }
  if (showTax) {
    out.push({ t: "r", l: `VAT ${settings.vatPercent}%`, r: money(totals.vatMinor), gray: true });
  }
  if (
    settings.receiptShowLoyalty &&
    showLoyaltyRedeemed &&
    sale.loyaltyRedeemMinor &&
    sale.loyaltyRedeemMinor > 0
  ) {
    out.push({ t: "r", l: "Loyalty", r: `-${money(sale.loyaltyRedeemMinor)}`, gray: true });
  }
  out.push({ t: "r", l: "TOTAL", r: money(sale.totalMinor), bold: true });
  out.push({ t: "s", h: 3 });

  if (settings.receiptShowTender) {
    out.push({ t: "d" });
    out.push({ t: "r", l: "Paid by", r: TENDER_LABEL[sale.tender], gray: true });
    if (sale.tender === "cash") {
      out.push({
        t: "r",
        l: "Tendered",
        r: money(sale.amountTenderedMinor ?? sale.totalMinor),
        gray: true,
      });
      if (showChange && sale.changeMinor != null) {
        out.push({ t: "r", l: "Change", r: money(sale.changeMinor) });
      }
    }
  }

  if (settings.receiptShowLoyalty && sale.loyaltyNumber) {
    out.push({ t: "s", h: 4 });
    out.push({ t: "d" });
    out.push({ t: "c", text: "LOYALTY", bold: true });
    out.push({ t: "r", l: "No.", r: sale.loyaltyNumber, gray: true });
    if (showLoyaltyBalance && sale.loyaltyBalanceBefore != null) {
      out.push({ t: "r", l: "Balance before", r: `${sale.loyaltyBalanceBefore} pts`, gray: true });
    }
    if (showLoyaltyRedeemed && sale.loyaltyPointsRedeemed && sale.loyaltyPointsRedeemed > 0) {
      out.push({ t: "r", l: "Points used", r: `-${sale.loyaltyPointsRedeemed} pts`, gray: true });
    }
    if (showLoyaltyEarned && earned > 0) {
      out.push({ t: "r", l: "Points earned", r: `+${earned} pts`, gray: true });
    }
    if (showLoyaltyBalance && sale.loyaltyBalanceAfter != null) {
      out.push({ t: "r", l: "Balance after", r: `${sale.loyaltyBalanceAfter} pts`, gray: true });
    }
  }

  if (settings.receiptShowGiftCard && sale.giftCardCode) {
    out.push({ t: "s", h: 4 });
    out.push({ t: "d" });
    out.push({ t: "c", text: "GIFT CARD", bold: true });
    out.push({ t: "r", l: "Card", r: maskGiftCard(sale.giftCardCode), gray: true });
    if (sale.giftCardChargedMinor != null) {
      out.push({ t: "r", l: "Charged", r: money(sale.giftCardChargedMinor), gray: true });
    }
    if (showGiftBalance && sale.giftCardBalanceAfterMinor != null) {
      out.push({ t: "r", l: "Balance left", r: money(sale.giftCardBalanceAfterMinor), gray: true });
    }
  }

  if (settings.receiptShowBarcode) {
    try {
      const canvas = document.createElement("canvas");
      const is58 = settings.receiptPaper === "58mm";
      // Render a dense source bitmap; the backend prints it at the target paper
      // size below (nearest-neighbour keeps barcode edges crisp).
      JsBarcode(canvas, sale.ticketId, {
        format: "CODE128",
        displayValue: false,
        width: is58 ? 2 : 2.5,
        height: 80,
        margin: 0,
      });
      const b64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
      if (b64 && canvas.width > 0 && canvas.height > 0) {
        out.push({ t: "s", h: 6 });
        out.push({
          t: "img",
          b64,
          wMm: is58 ? 32 : 40,
          hMm: is58 ? 12 : 14,
        });
      }
    } catch {
      // Barcode rendering failure is non-fatal; receipt still prints.
    }
  }

  if (showFooter && settings.receiptFooter) {
    out.push({ t: "s", h: 6 });
    centered(settings.receiptFooter);
  }
  if (settings.receiptShowPoweredBy) {
    out.push({ t: "s", h: 4 });
    centered("POWERED BY HERKINTORMIWER");
  }

  return out;
}

export async function printReceipt(sale: SaleReceipt) {
  const config = loadPrinterConfig();
  if (!config.receiptPrinter) {
    throw new Error("No receipt printer in Settings.");
  }
  const settings = overlayReceiptIdentity(loadStoreSettings());
  const copies = Math.max(1, settings.receiptCopies);
  const widthMm = settings.receiptPaper === "58mm" ? 58 : 80;
  const layout = buildReceiptLayout(sale, settings);
  await sendReceiptLayout(config.receiptPrinter, layout, widthMm, copies);
  return config.receiptPrinter;
}
