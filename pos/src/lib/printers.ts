const KEY = "pos.printer-config.v1";
const API = "/api";

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
  const res = await fetch(`${API}/hardware/printers`);
  if (!res.ok) throw new Error("Could not read installed printers.");
  return res.json();
}

export async function sendToPrinter(printerName: string, content: string) {
  const res = await fetch(`${API}/hardware/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ printerName, content }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Print job failed.");
  }
  return body;
}
