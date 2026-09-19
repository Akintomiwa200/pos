import type { CartLine, TenderType } from "./types";
import { computeLineTotals, formatMoney } from "./types";
import { formatLineQty } from "./units";
import {
  getPrinterGeometry,
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
  const totals = computeLineTotals(sale.lines, settings);
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
    ...(showTax
      ? totals.vatSlices.map(
          (slice) => `VAT ${slice.ratePercent}%  ${money(slice.taxMinor)}`,
        )
      : []),
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

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Printed width, in points (1/72"), of <text> at the given point size in
 * Consolas. Calibrated against GDI+'s actual DrawString layout on Windows
 * (10pt ≈ 5.9pt/char incl. advance; 13pt ≈ 7.67pt/char), plus a flat rounding
 * buffer — so a line that fits here with the backend's NoWrap+ellipsis never
 * gets cut on the real printer.
 */
function textWidthPt(text: string, pt: number): number {
  const perChar = pt >= 12 ? 7.67 : 5.9;
  return text.length * perChar + 1.5;
}

/**
 * Word-wrap text so every resulting line fits within <avail> points of printed
 * width. Words longer than the line are hard-broken at the widest fitting
 * prefix. Uses real advance widths so the backend's NoWrap ellipsis never fires.
 */
function wrapCentered(text: string, avail: number, pt: number): string[] {
  const lines: string[] = [];
  const fit = Math.max(20, avail);
  for (const para of text.split("\n")) {
    const words = para.trim().split(/[\s\u00a0]+/).filter(Boolean);
    let cur = "";
    for (let word of words) {
      const trial = cur ? `${cur} ${word}` : word;
      if (textWidthPt(trial, pt) <= fit) {
        cur = trial;
        continue;
      }
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      while (textWidthPt(word, pt) > fit && word.length > 1) {
        let lo = 1;
        let hi = word.length;
        let best = 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (textWidthPt(word.slice(0, mid), pt) <= fit) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        lines.push(word.slice(0, best));
        word = word.slice(best);
      }
      if (word) cur = word;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

/**
 * Builds the printed receipt as a list of primitive text/Dash/image lines that
 * mirror the on-screen ReceiptVisual. The backend renders these natively with
 * GDI+ DrawString, so the text is always printing at the printer's native
 * resolution — pixel-crisp, never blurred by raster re-sampling.
 */
function renderBarcode(
  canvas: HTMLCanvasElement,
  value: string,
  targetPx: number,
  hMm: number,
  wMm: number,
) {
  const heightPx = Math.max(56, Math.round(targetPx * (hMm / wMm)));
  // Approximate the module pitch so the resulting raster is close to the
  // printer's native dots-per-mm; the backend then scales ~1:1 (nearest
  // neighbour), which keeps bars crisp instead of chunky.
  const modules = (value.length + 3) * 11;
  let moduleW = Math.max(2, Math.round(targetPx / modules));
  for (let attempt = 0; attempt < 3; attempt++) {
    JsBarcode(canvas, value, {
      format: "CODE128",
      displayValue: false,
      width: moduleW,
      height: heightPx,
      margin: 0,
    });
    if (canvas.width < targetPx * 0.85) {
      moduleW = Math.max(moduleW + 1, Math.ceil((moduleW * targetPx) / canvas.width));
    } else break;
  }
}

export function buildReceiptLayout(
  sale: SaleReceipt,
  settings: StoreSettings,
  opts: { widthMm?: number; dpi?: number } = {},
): ReceiptRichLine[] {
  const out: ReceiptRichLine[] = [];
  const paperMm = settings.receiptPaper === "58mm" ? 58 : 80;
  // Layout to the *printable* width reported live by the driver (defaults to
  // the nominal paper width) so nothing is handed to the printer beyond its
  // hardware margins, where it would silently clip.
  const useWidthMm = Math.max(48, Math.min(80, Math.round(opts.widthMm ?? paperMm)));
  const dpi = opts.dpi && opts.dpi > 0 ? Math.round(opts.dpi) : 203;
  const totals = computeLineTotals(sale.lines, settings);
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

  // The backend draws centered lines as single NoWrap strings and would
  // ellipsis-cut anything wider than the printable area, so wrap client-side
  // using the *actual* Consolas advance widths (not a char-count guess). Word
  // wrapping at boundaries also avoids ugly mid-word splits on printed paper.
  const availPt = Math.max(60, ((useWidthMm / 25.4) * 72 - 12) * 0.97);
  const platePt = Math.max(60, (useWidthMm / 25.4) * 72 - 12);
  const centered = (text: string, opts: { bold?: boolean } = {}) => {
    if (!text.trim()) return;
    for (const line of wrapCentered(text, availPt, opts.bold ? 13 : 10)) {
      out.push({ t: "c", text: line, ...opts });
    }
  };

  // A table row whose left label is too long to sit next to its right-aligned
  // value. Wrap the label at word boundaries so the name never collides with
  // the amount; continuation lines carry no value (the backend draws an empty
  // right side as nothing), and the final line keeps the amount.
  const pushRow = (
    label: string,
    value: string,
    opts: { gray?: boolean; bold?: boolean } = {},
  ) => {
    const amountW = value ? textWidthPt(value, 10) : 0;
    const leftAvail = platePt - amountW - (value ? 6 : 0);
    const wrapped = wrapCentered(label, Math.max(20, leftAvail), 10);
    // A wrapped separator ("·") on its own line looks broken — glue it onto the
    // previous continuation line (which has no amount, so it can use the whole
    // printable width).
    const lines: string[] = [];
    const isSep = (s: string) => /^[\u00b7\u2022\u2013\u2014-]+$/.test(s.trim());
    for (const line of wrapped) {
      const prev = lines[lines.length - 1];
      if (isSep(line) && prev && textWidthPt(`${prev} ${line}`, 10) <= platePt) {
        lines[lines.length - 1] = `${prev} ${line}`;
      } else {
        lines.push(line);
      }
    }
    if (lines.length && isSep(lines[lines.length - 1])) lines.pop();
    if (lines.length === 1) {
      out.push({ t: "r", l: lines[0], r: value, ...opts });
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      out.push({
        t: "r",
        l: lines[i],
        r: i === lines.length - 1 ? value : "",
        ...opts,
      });
    }
  };

  if (settings.receiptShowLogo) {
    out.push({ t: "c", text: initialsOf(title), bold: true });
  }
  if (showTitle) {
    centered(bold ? title.toUpperCase() : title, { bold });
  }
  if (
    settings.receiptLocation &&
    !sameName(settings.receiptLocation, title) &&
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
    pushRow(line.name + skuBit, money(line.unitPriceMinor * line.quantity));
    pushRow(
      `${formatLineQty(line.quantity, line.unit, line.unitLabel)} x ${money(line.unitPriceMinor)}`,
      "",
      { gray: true },
    );
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
    for (const slice of totals.vatSlices) {
      out.push({
        t: "r",
        l: `VAT ${slice.ratePercent}%`,
        r: money(slice.taxMinor),
        gray: true,
      });
    }
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
      // Keep clear quiet zones and a scannable width, sized to the real
      // printable area.
      const wMm = Math.round(Math.max(24, Math.min(is58 ? 34 : 42, useWidthMm - 8)));
      const hMm = Math.round(wMm * 0.42);
      const targetPx = Math.round((wMm / 25.4) * dpi);
      renderBarcode(canvas, sale.ticketId, targetPx, hMm, wMm);
      const b64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
      if (b64 && canvas.width > 0 && canvas.height > 0) {
        out.push({ t: "s", h: 6 });
        out.push({ t: "img", b64, wMm, hMm });
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
  const paperMm = settings.receiptPaper === "58mm" ? 58 : 80;
  const geometry = await getPrinterGeometry(config.receiptPrinter);
  const widthMm = Math.min(paperMm, geometry.printableWidthMm || paperMm);
  const layout = buildReceiptLayout(sale, settings, {
    widthMm,
    dpi: geometry.dpi,
  });
  await sendReceiptLayout(config.receiptPrinter, layout, widthMm, copies);
  return config.receiptPrinter;
}
