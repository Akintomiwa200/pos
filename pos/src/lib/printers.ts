import { apiUrl } from "./api-base";

const KEY = "pos.printer-config.v1";

export type PrinterRole = "unused" | "receipt" | "kitchen" | "label";

export type DetectedPrinter = {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  offline: boolean;
  dpi?: number;
};

export type PrinterConfig = {
  receiptPrinter: string | null;
  kitchenPrinter: string | null;
  labelPrinter: string | null;
};

export const emptyPrinterConfig = (): PrinterConfig => ({
  receiptPrinter: null,
  kitchenPrinter: null,
  labelPrinter: null,
});

export function loadPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPrinterConfig();
    return { ...emptyPrinterConfig(), ...JSON.parse(raw) };
  } catch {
    return emptyPrinterConfig();
  }
}

export function savePrinterConfig(config: PrinterConfig) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export async function detectPrinters(): Promise<DetectedPrinter[]> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/hardware/printers"));
  } catch {
    throw new Error("Backend offline. Start the POS server, then scan again.");
  }
  if (!res.ok) throw new Error("Could not read installed printers.");
  return res.json();
}

let dpiCache: { name: string; dpi: number; at: number } | null = null;

/**
 * Native resolution (DPI) of the assigned printer. The receipt image is rasterised
 * at this exact density so Windows prints it 1:1 with no re-sampling — otherwise
 * the driver's bicubic smoothing makes the text look blurry.
 */
export async function getPrinterDpi(printerName: string): Promise<number> {
  const now = Date.now();
  if (dpiCache && dpiCache.name === printerName && now - dpiCache.at < 60_000) {
    return dpiCache.dpi;
  }
  try {
    const list = await detectPrinters();
    const hit = list.find((printer) => printer.name === printerName);
    const dpi = hit?.dpi && hit.dpi > 0 ? Math.round(hit.dpi) : 203;
    dpiCache = { name: printerName, dpi, at: now };
    return dpi;
  } catch {
    return 203;
  }
}

export async function sendToPrinter(printerName: string, content: string, widthMm?: number) {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/hardware/print"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printerName, content, widthMm }),
    });
  } catch {
    throw new Error("Backend offline. Receipt will print when the server is back.");
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Print job failed.");
  }
  return body;
}

export type ReceiptRichLine =
  | { t: "c"; text: string; bold?: boolean }
  | { t: "r"; l: string; r: string; gray?: boolean; bold?: boolean }
  | { t: "d" }
  | { t: "s"; h?: number }
  | { t: "img"; b64: string; wMm: number; hMm: number };

export async function sendReceiptLayout(
  printerName: string,
  layout: ReceiptRichLine[],
  widthMm: number,
  copies = 1,
) {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/hardware/print"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        printerName,
        widthMm,
        copies: Math.max(1, Math.round(copies)),
        layout,
      }),
    });
  } catch {
    throw new Error("Backend offline. Receipt will print when the server is back.");
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Receipt print job failed.");
  return body;
}

export async function sendReceiptImage(
  printerName: string,
  image: { imageBase64: string; widthMm: number; heightMm: number },
  copies = 1,
) {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/hardware/print-labels"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        printerName,
        labels: [{ ...image, copies: Math.max(1, Math.round(copies)) }],
      }),
    });
  } catch {
    throw new Error("Backend offline. Receipt will print when the server is back.");
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; printer?: string };
  if (!res.ok) throw new Error(body.error ?? "Receipt print job failed.");
  return body;
}
