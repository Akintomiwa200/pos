import JsBarcode from "jsbarcode";
import type { StoreSettings } from "./store-settings";
import type { TenderType } from "./types";
import { computeLineTotals, formatMoney } from "./types";
import { formatLineQty } from "./units";
import type { SaleReceipt } from "./receipt";

/**
 * Renders the receipt as a raster the same as the on-screen ReceiptVisual preview.
 *
 * The image is rasterised at the printer's native resolution (`dpi`) so Windows
 * maps the bitmap 1:1 onto the paper with zero re-sampling — text stays pixel-crisp
 * and sized exactly like the preview (no small, blurry output).
 */
const DEFAULT_DPI = 203;

const TENDER_LABEL: Record<TenderType, string> = {
  cash: "Cash",
  card: "Credit Card",
  transfer: "Transfer",
  wallet: "Wallet",
  split: "Split",
  room_charge: "Room charge",
};

const PAD_MM = 0.065;

type PaintFn = (ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number) => void;

function block(height: number, paint: PaintFn) {
  return { height: Math.max(1, height), paint };
}

function measureLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
) {
  if (!text) return [""];
  ctx.font = font;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function ellipse(text: string, ctx: CanvasRenderingContext2D, maxWidth: number) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const dots = "…";
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}${dots}`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}${dots}`;
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

function maskGiftCard(code: string) {
  const clean = code.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 2)}-····${clean.slice(-4)}`;
}

export function renderReceiptPrintImage(sale: SaleReceipt, settings: StoreSettings, dpi = DEFAULT_DPI) {
  const widthMm = settings.receiptPaper === "58mm" ? 58 : 80;
  const pxPerMm = Math.min(600, Math.max(100, Math.round(dpi))) / 25.4;
  const canvasWidth = Math.round(widthMm * pxPerMm);
  // Preview paper is 300 CSS px (80mm) / 220 CSS px (58mm); scale so the printed
  // result looks proportionally identical to the on-screen ReceiptVisual.
  const scale = canvasWidth / (widthMm === 58 ? 220 : 300);
  const padding = Math.round(canvasWidth * PAD_MM);
  const x0 = padding;
  const x1 = canvasWidth - padding;
  const contentWidth = x1 - x0;

  const dense =
    settings.receiptTemplate === "compact" || settings.receiptTemplate === "minimal";
  const bold = settings.receiptTemplate === "bold";
  const isMinimal = settings.receiptTemplate === "minimal";
  const accent = settings.receiptBrandColor || "#111827";
  const title = settings.storeName.trim() || "Your store";

  const showTitle = settings.receiptShowTitle !== false;
  const showAddress = !isMinimal && settings.receiptShowAddress !== false;
  const showEmail = !isMinimal && settings.receiptShowEmail !== false;
  const showPhone = !isMinimal && settings.receiptShowPhone !== false;
  const showHeader = settings.receiptShowHeader !== false;
  const showFooter = settings.receiptShowFooter !== false;
  const showTax = settings.receiptShowTax !== false;
  const showDiscount = settings.receiptShowDiscount !== false;
  const showChange = settings.receiptShowChange !== false;

  const baseFontSize = Math.round((dense ? 10 : 11) * scale);
  const baseLine = Math.round(baseFontSize * (dense ? 1.35 : 1.45));
  const titleFontSize = bold ? Math.round(13 * scale) : baseFontSize + Math.round(scale);
  const mono = (px: number, weight = "") =>
    `${weight}${px}px Consolas, "Courier New", ui-monospace, monospace`;

  const MUTED = "rgba(17, 24, 39, 0.7)";
  const INK = "#111827";

  const measure = document.createElement("canvas").getContext("2d");

  if (!measure) throw new Error("Your browser cannot render receipt images.");
  const helper: CanvasRenderingContext2D = measure;

  const totals = computeLineTotals(sale.lines, settings);
  const total = sale.totalMinor ?? totals.totalMinor;
  const tendered = sale.amountTenderedMinor ?? total;
  const change = sale.changeMinor ?? Math.max(0, tendered - total);
  const money = (n: number) => formatMoney(n, settings.currency || "NGN");

  const blocks: ReturnType<typeof block>[] = [];

  if (settings.receiptShowLogo) {
    const size = Math.round(40 * scale);
    const yOffset = Math.round(size / 2 + 4 * scale);
    blocks.push(
      block(
        size + 8 * scale,
        (ctx, cx0, cx1, y) => {
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc((cx0 + cx1) / 2, y + size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(11 * scale)}px Arial, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(initialsOf(title), (cx0 + cx1) / 2, y + yOffset);
          ctx.textBaseline = "alphabetic";
        },
      ),
    );
  }

  if (showTitle) {
    blocks.push(
      block(
        Math.round(titleFontSize * 1.4),
        (ctx, cx0, cx1, y) => {
          ctx.font = mono(titleFontSize, bold ? "bold " : "");
          ctx.fillStyle = bold ? accent : INK;
          ctx.textAlign = "center";
          ctx.fillText(title, (cx0 + cx1) / 2, y + titleFontSize);
          ctx.textAlign = "left";
        },
      ),
    );
  }

  const centerLines: string[] = [];
  if (
    settings.receiptLocation &&
    settings.receiptLocation !== title &&
    (showTitle || showAddress)
  ) {
    centerLines.push(settings.receiptLocation);
  }
  if (showAddress && settings.storeAddress) centerLines.push(settings.storeAddress);
  if (showEmail && settings.storeEmail) centerLines.push(settings.storeEmail);
  if (showPhone && settings.storePhone) centerLines.push(settings.storePhone);

  for (const text of centerLines) {
    blocks.push(
      block(
        baseLine,
        (ctx, cx0, cx1, y) => {
          ctx.font = mono(baseFontSize);
          ctx.fillStyle = MUTED;
          ctx.textAlign = "center";
          ctx.fillText(text, (cx0 + cx1) / 2, y + baseFontSize);
          ctx.textAlign = "left";
        },
      ),
    );
  }

  if (showHeader && settings.receiptHeader) {
    const font = mono(baseFontSize);
    const headerLines = measureLines(measure, settings.receiptHeader, font, contentWidth);
    blocks.push(
      block(
        headerLines.length * baseLine + Math.round(12 * scale),
        (ctx, cx0, cx1, y) => {
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.lineWidth = Math.max(1, Math.round(scale * 1));
          ctx.setLineDash([Math.max(3, Math.round(scale * 5)), Math.max(3, Math.round(scale * 4))]);
          ctx.beginPath();
          ctx.moveTo(cx0, y + Math.round(3 * scale));
          ctx.lineTo(cx1, y + Math.round(3 * scale));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = font;
          ctx.fillStyle = "rgba(17, 24, 39, 0.8)";
          ctx.textAlign = "center";
          let ty = y + Math.round(6 * scale) + baseFontSize;
          for (const line of headerLines) {
            ctx.fillText(line, (cx0 + cx1) / 2, ty);
            ty += baseLine;
          }
          ctx.textAlign = "left";
          ctx.beginPath();
          ctx.moveTo(cx0, ty - Math.round(7 * scale));
          ctx.lineTo(cx1, ty - Math.round(7 * scale));
          ctx.stroke();
        },
      ),
    );
  }

  const dashH = Math.round(12 * scale);
  const row = (label: string, value: string, opts?: { strong?: boolean; accent?: boolean }) =>
    block(
      baseLine,
      (ctx, cx0, cx1, y) => {
        ctx.font = mono(baseFontSize, opts?.strong ? "bold " : "");
        ctx.fillStyle = opts?.accent ? accent : INK;
        ctx.textAlign = "left";
        const maxLabel = contentWidth - ctx.measureText(value).width - Math.round(8 * scale);
        ctx.fillText(ellipse(label, ctx, maxLabel), cx0, y + baseFontSize);
        ctx.textAlign = "right";
        ctx.fillText(value, cx1, y + baseFontSize);
        ctx.textAlign = "left";
      },
    );
  const mutedRow = (label: string, value: string) =>
    block(
      baseLine,
      (ctx, cx0, cx1, y) => {
        ctx.font = mono(baseFontSize);
        ctx.fillStyle = MUTED;
        ctx.textAlign = "left";
        const maxLabel = contentWidth - ctx.measureText(value).width - Math.round(8 * scale);
        ctx.fillText(ellipse(label, ctx, maxLabel), cx0, y + baseFontSize);
        ctx.textAlign = "right";
        ctx.fillText(value, cx1, y + baseFontSize);
        ctx.textAlign = "left";
      },
    );

  const dashBlock = () =>
    block(
      dashH,
      (ctx, cx0, cx1, y) => {
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = Math.max(1, Math.round(scale));
        ctx.setLineDash([Math.max(3, Math.round(scale * 5)), Math.max(3, Math.round(scale * 4))]);
        ctx.beginPath();
        ctx.moveTo(cx0, y + Math.round(dashH / 2));
        ctx.lineTo(cx1, y + Math.round(dashH / 2));
        ctx.stroke();
        ctx.setLineDash([]);
      },
    );

  if (
    settings.receiptShowTicketNumber !== false ||
    settings.receiptShowDate !== false ||
    settings.receiptShowCashier ||
    settings.receiptShowTill
  ) {
    blocks.push(dashBlock());
    if (settings.receiptShowTicketNumber !== false) {
      blocks.push(row("Receipt #", sale.ticketId, { strong: true }));
    }
    if (settings.receiptShowDate !== false) {
      const when = new Date(sale.paidAt);
      blocks.push(
        mutedRow(
          "Date",
          `${when.toLocaleDateString("en-GB")} ${when.toLocaleTimeString("en-GB", { hour12: false })}`,
        ),
      );
    }
    if (settings.receiptShowCashier) blocks.push(mutedRow("Cashier", sale.cashierName));
    if (settings.receiptShowTill && sale.tillKey) blocks.push(mutedRow("Till", sale.tillKey));
  }

  if (settings.receiptShowCustomer && (sale.customerName || sale.customerPhone)) {
    blocks.push(dashBlock());
    if (sale.customerName) blocks.push(row("Customer", sale.customerName));
    if (settings.receiptShowCustomerPhone !== false && sale.customerPhone) {
      blocks.push(mutedRow("Phone", sale.customerPhone));
    }
  }

  if (sale.lines.length > 0) {
    blocks.push(dashBlock());
    for (const line of sale.lines) {
      const skuBit = settings.showSkuOnReceipt && line.sku ? ` · ${line.sku}` : "";
      blocks.push(
        block(
          baseLine + 5 * scale,
          (ctx, cx0, cx1, y) => {
            ctx.font = mono(baseFontSize);
            ctx.fillStyle = INK;
            const totalStr = money(line.unitPriceMinor * line.quantity);
            const nameWidth =
              contentWidth - ctx.measureText(totalStr).width - Math.round(8 * scale);
            ctx.textAlign = "left";
            ctx.fillText(ellipse(`${line.name}${skuBit}`, ctx, nameWidth), cx0, y + baseFontSize);
            ctx.textAlign = "right";
            ctx.fillText(totalStr, cx1, y + baseFontSize);
            ctx.textAlign = "left";
          },
        ),
      );
      blocks.push(
        mutedRow(
          `${formatLineQty(line.quantity, line.unit, line.unitLabel)} x ${money(line.unitPriceMinor)}`,
          "",
        ),
      );
    }
  }

  blocks.push(dashBlock());
  blocks.push(row("Subtotal", money(totals.subtotalMinor)));
  if (showDiscount && (sale.discountMinor ?? totals.discountMinor) > 0) {
    blocks.push(mutedRow("Discount", `-${money(sale.discountMinor ?? totals.discountMinor)}`));
  }
  if (showTax && settings.applyServiceCharge && totals.serviceMinor > 0) {
    blocks.push(
      mutedRow(`Service ${settings.servicePercent}%`, money(totals.serviceMinor)),
    );
  }
  if (showTax) {
    for (const slice of totals.vatSlices) {
      blocks.push(mutedRow(`VAT ${slice.ratePercent}%`, money(slice.taxMinor)));
    }
  }
  if (
    settings.receiptShowLoyalty &&
    settings.receiptShowLoyaltyRedeemed !== false &&
    sale.loyaltyRedeemMinor &&
    sale.loyaltyRedeemMinor > 0
  ) {
    blocks.push(mutedRow("Loyalty", `-${money(sale.loyaltyRedeemMinor)}`));
  }
  blocks.push(
    block(
      Math.round((bold ? 13 : baseFontSize) * 1.5),
      (ctx, cx0, cx1, y) => {
        ctx.font = mono(bold ? Math.round(13 * scale) : baseFontSize + Math.round(scale), bold ? "bold " : "");
        ctx.fillStyle = bold ? accent : INK;
        ctx.textAlign = "left";
        ctx.fillText("TOTAL", cx0, y + (bold ? Math.round(13 * scale) : baseFontSize + Math.round(scale)));
        ctx.textAlign = "right";
        ctx.fillText(money(total), cx1, y + (bold ? Math.round(13 * scale) : baseFontSize + Math.round(scale)));
        ctx.textAlign = "left";
      },
    ),
  );

  if (settings.receiptShowTender) {
    blocks.push(
      block(
        Math.round(8 * scale) + 6 * scale,
        (ctx, cx0, cx1, y) => {
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.lineWidth = Math.max(1, Math.round(scale));
          ctx.setLineDash([Math.max(3, Math.round(scale * 5)), Math.max(3, Math.round(scale * 4))]);
          ctx.beginPath();
          ctx.moveTo(cx0, y);
          ctx.lineTo(cx1, y);
          ctx.stroke();
          ctx.setLineDash([]);
        },
      ),
    );
    blocks.push(mutedRow("Paid by", TENDER_LABEL[sale.tender]));
    if (sale.tender === "cash") {
      blocks.push(mutedRow("Tendered", money(tendered)));
      if (showChange) blocks.push(row("Change", money(change)));
    }
  }

  if (settings.receiptShowLoyalty && sale.loyaltyNumber) {
    blocks.push(
      block(
        Math.round(8 * scale) + 6 * scale,
        (ctx, cx0, cx1, y) => {
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.lineWidth = Math.max(1, Math.round(scale));
          ctx.setLineDash([Math.max(3, Math.round(scale * 5)), Math.max(3, Math.round(scale * 4))]);
          ctx.beginPath();
          ctx.moveTo(cx0, y);
          ctx.lineTo(cx1, y);
          ctx.stroke();
          ctx.setLineDash([]);
        },
      ),
    );
    blocks.push(row("Loyalty", "", { strong: true }));
    blocks.push(mutedRow("No.", sale.loyaltyNumber));
    if (settings.receiptShowLoyaltyBalance !== false && sale.loyaltyBalanceBefore != null) {
      blocks.push(mutedRow("Balance before", `${sale.loyaltyBalanceBefore} pts`));
    }
    if (
      settings.receiptShowLoyaltyRedeemed !== false &&
      sale.loyaltyPointsRedeemed &&
      sale.loyaltyPointsRedeemed > 0
    ) {
      blocks.push(mutedRow("Points used", `-${sale.loyaltyPointsRedeemed} pts`));
    }
    if (
      settings.receiptShowLoyaltyEarned !== false &&
      sale.loyaltyPointsEarned &&
      sale.loyaltyPointsEarned > 0
    ) {
      blocks.push(mutedRow("Points earned", `+${sale.loyaltyPointsEarned} pts`));
    }
    if (settings.receiptShowLoyaltyBalance !== false && sale.loyaltyBalanceAfter != null) {
      blocks.push(mutedRow("Balance after", `${sale.loyaltyBalanceAfter} pts`));
    }
  }

  if (settings.receiptShowGiftCard && sale.giftCardCode) {
    blocks.push(
      block(
        Math.round(8 * scale) + 6 * scale,
        (ctx, cx0, cx1, y) => {
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.lineWidth = Math.max(1, Math.round(scale));
          ctx.setLineDash([Math.max(3, Math.round(scale * 5)), Math.max(3, Math.round(scale * 4))]);
          ctx.beginPath();
          ctx.moveTo(cx0, y);
          ctx.lineTo(cx1, y);
          ctx.stroke();
          ctx.setLineDash([]);
        },
      ),
    );
    blocks.push(row("Gift card", "", { strong: true }));
    blocks.push(mutedRow("Card", maskGiftCard(sale.giftCardCode)));
    if (sale.giftCardChargedMinor != null) {
      blocks.push(mutedRow("Charged", money(sale.giftCardChargedMinor)));
    }
    if (settings.receiptShowGiftCardBalance !== false && sale.giftCardBalanceAfterMinor != null) {
      blocks.push(mutedRow("Balance left", money(sale.giftCardBalanceAfterMinor)));
    }
  }

  let barcodeHeight = 0;
  if (settings.receiptShowBarcode) {
    const bar = document.createElement("canvas");
    try {
      JsBarcode(bar, sale.ticketId, {
        format: "CODE128",
        displayValue: true,
        font: "monospace",
        fontSize: Math.round(14 * scale),
        textMargin: 1,
        margin: 0,
        width: (widthMm === 58 ? 1.1 : 1.35) * scale,
        height: (widthMm === 58 ? 36 : 44) * scale,
        background: "#ffffff",
        lineColor: INK,
      });
      const ratio = Math.min(contentWidth / bar.width, 1);
      const drawWidth = bar.width * ratio;
      const drawHeight = bar.height * ratio;
      blocks.push(
        block(
          drawHeight + 12 * scale,
          (ctx, cx0, cx1, y) => {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(bar, (cx0 + cx1 - drawWidth) / 2, y, drawWidth, drawHeight);
          },
        ),
      );
    } catch {
      // Invalid barcode value: skip it rather than print nothing readable.
    }
  }

  if (showFooter && settings.receiptFooter) {
    blocks.push(
      block(
        Math.round(12 * scale) + baseLine,
        (ctx, cx0, cx1, y) => {
          ctx.font = mono(baseFontSize);
          ctx.fillStyle = "rgba(17, 24, 39, 0.8)";
          ctx.textAlign = "center";
          ctx.fillText(settings.receiptFooter, (cx0 + cx1) / 2, y + Math.round(12 * scale) + baseFontSize);
          ctx.textAlign = "left";
        },
      ),
    );
  }

  if (settings.receiptShowPoweredBy) {
    blocks.push(
      block(
        Math.round(10 * scale) + Math.round(9 * scale),
        (ctx, cx0, cx1, y) => {
          ctx.font = mono(Math.round(9 * scale));
          ctx.fillStyle = "rgba(17, 24, 39, 0.45)";
          ctx.textAlign = "center";
          ctx.fillText(
            "Powered by Herkintormiwer",
            (cx0 + cx1) / 2,
            y + Math.round(10 * scale) + Math.round(9 * scale),
          );
          ctx.textAlign = "left";
        },
      ),
    );
  }

  const contentHeight = blocks.reduce((sum, item) => sum + item.height, 0);
  const canvasHeight = Math.max(Math.round(canvasWidth * 1.2), Math.round(padding * 2 + contentHeight));

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot render receipt images.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = padding;
  for (const item of blocks) {
    item.paint(ctx, x0, x1, y);
    y += item.height;
  }
  const usedHeight = Math.max(45, Math.ceil((y + padding) / pxPerMm));

  return {
    imageBase64: canvas.toDataURL("image/png").split(",")[1] ?? "",
    widthMm,
    heightMm: usedHeight,
  };
}