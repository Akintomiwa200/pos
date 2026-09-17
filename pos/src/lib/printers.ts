import { apiUrl } from "./api-base";

const KEY = "pos.printer-config.v1";

export type PrinterRole = "unused" | "receipt" | "kitchen" | "label";

export type DetectedPrinter = {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  offline: boolean;
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
