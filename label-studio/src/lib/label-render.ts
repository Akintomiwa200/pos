import JsBarcode from "jsbarcode";

export const LABEL_PRESETS = [
  { key: "40x30", widthMm: 40, heightMm: 30, label: "40 x 30 mm", hint: "Classic price sticker" },
  { key: "50x30", widthMm: 50, heightMm: 30, label: "50 x 30 mm", hint: "Shelf label" },
  { key: "40x40", widthMm: 40, heightMm: 40, label: "40 x 40 mm", hint: "Square sticker" },
  { key: "58x40", widthMm: 58, heightMm: 40, label: "58 x 40 mm", hint: "Wide shelf label" },
  { key: "60x50", widthMm: 60, heightMm: 50, label: "60 x 50 mm", hint: "Large label" },
] as const;

export type LabelPreset = (typeof LABEL_PRESETS)[number];

export const LABEL_DPI = 300;
const MM2PX = LABEL_DPI / 25.4;

export function ean13CheckDigit(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 12);
  if (d.length !== 12) return -1;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function makeValidBarcode(existing: string[]) {
  const used = new Set(existing.map((code) => code.toLowerCase()).filter(Boolean));
  const seed = 890123456000;
  for (let base = seed; base < seed + 1_000_000; base += 1) {
    const digits = String(base);
    const check = ean13CheckDigit(digits);
    if (check < 0) continue;
    const code = `${digits}${check}`;
    if (!used.has(code)) return code;
  }
  return "";
}

function pickFormat(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13 && ean13CheckDigit(digits.slice(0, 12)) === Number(digits[12])) {
    return "EAN13";
  }
  return "CODE128";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      if (lines.length === maxLines) break;
      lines.push(line);
      line = word;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === 0 && text) lines.push(text);
  return lines.slice(0, maxLines);
}

export function renderLabelDataUrl(opts: {
  barcode: string;
  name?: string;
  price?: string;
  showPrice: boolean;
  widthMm: number;
  heightMm: number;
}) {
  const bcValue = opts.barcode.trim();
  const widthPx = Math.max(120, Math.round(opts.widthMm * MM2PX));
  const heightPx = Math.max(150, Math.round(opts.heightMm * MM2PX));
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.fillStyle = "#000000";
  const margin = Math.max(8, Math.round(2.5 * MM2PX));
  const innerW = widthPx - margin * 2;

  let y = margin;
  if (opts.name) {
    const nameFont = Math.round(3.3 * MM2PX);
    ctx.font = `600 ${nameFont}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const nameLines = wrapLines(ctx, opts.name, innerW, 2);
    const lineHeight = Math.round(nameFont * 1.25);
    for (const line of nameLines) {
      ctx.fillText(line, margin, y + lineHeight);
      y += lineHeight;
    }
  }

  if (opts.showPrice && opts.price) {
    const priceFont = Math.round(4.4 * MM2PX);
    ctx.font = `700 ${priceFont}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    y = Math.max(y, heightPx / 2 - Math.round(8 * MM2PX));
    y += Math.round(priceFont * 1.3);
    ctx.fillText(opts.price, margin, y);
  }

  const codeFont = Math.round(2.7 * MM2PX);
  const barcodeTop = y + Math.round(2.5 * MM2PX);
  const bcAreaBottom = heightPx - margin;
  const bcH = Math.max(60, bcAreaBottom - barcodeTop - Math.round(codeFont * 1.5));
  const bcCanvas = document.createElement("canvas");
  bcCanvas.width = innerW;
  bcCanvas.height = bcH;
  try {
    JsBarcode(bcCanvas, bcValue, {
      format: pickFormat(bcValue),
      width: 2,
      height: bcH,
      margin: 0,
      displayValue: false,
    });
  } catch {
    try {
      JsBarcode(bcCanvas, bcValue, {
        format: "CODE128",
        width: 2,
        height: bcH,
        margin: 0,
        displayValue: false,
      });
    } catch {
      return { dataUrl: canvas.toDataURL("image/png"), widthPx, heightPx };
    }
  }
  const scale = Math.min(1, innerW / Math.max(1, bcCanvas.width));
  const drawW = bcCanvas.width * scale;
  const drawH = bcCanvas.height * scale;
  ctx.drawImage(bcCanvas, margin + (innerW - drawW) / 2, barcodeTop, drawW, drawH);

  ctx.font = `500 ${codeFont}px ui-monospace, SFMono-Regular, Consolas, "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(bcValue, widthPx / 2, barcodeTop + drawH + Math.round(codeFont * 1.25));
  ctx.textAlign = "left";

  return { dataUrl: canvas.toDataURL("image/png"), widthPx, heightPx };
}