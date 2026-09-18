import { formatMoney } from "./types";
import { loadStoreSettings } from "./store-settings";
import { findTill, tillLabel } from "./tills";
import { loadPrinterConfig, sendToPrinter } from "./printers";
import type { ShiftRecord, StaffUser } from "./staff";
import { apiUrl } from "./api-base";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(
      Array.isArray((data as { message?: string[] }).message)
        ? "Request failed"
        : ((data as { message?: string }).message ?? "Request failed"),
    );
  }
  return data;
}

export async function loginWithPassword(username: string, password: string) {
  return await post<{
    user: StaffUser;
    needsOpenShift: boolean;
  }>("/api/auth/login", { username, password });
}

export async function loginWithPin(staffId: string, pin: string) {
  return await post<{
    user: StaffUser;
    needsOpenShift: boolean;
  }>("/api/auth/login", { staffId, pin });
}

export async function listStaff() {
  const response = await fetch(apiUrl("/api/staff"));
  if (!response.ok) throw new Error(`Staff request failed (${response.status})`);
  return (await response.json()) as StaffUser[];
}

export async function unlockWithPin(pin: string) {
  return await post<StaffUser>("/api/staff/unlock", { pin });
}

export async function openShift(staffId: string) {
  return await post<ShiftRecord>("/api/staff/shift/open", { staffId });
}

export async function closeShift(staffId: string, pin?: string) {
  if (pin) await unlockWithPin(pin);
  return await post<ShiftRecord | null>("/api/staff/shift/close", {
    staffId,
    pin,
  });
}

export async function recordShiftSale(staffId: string, amountMinor: number) {
  try {
    await post("/api/staff/shift/sale", { staffId, amountMinor });
  } catch {
    // local till copy keeps the total; next shift report reconciles
  }
}

export async function closeDay(pin?: string, staffId?: string) {
  if (pin) await unlockWithPin(pin);
  return await post<{ closedAt: string }>("/api/staff/day/close", { pin, staffId });
}

export function formatShiftReport(
  shift: ShiftRecord | null,
  unlockedBy: StaffUser,
  kind: "shift" | "day",
  extras?: { salesCount?: number; salesMinor?: number },
) {
  const when = new Date();
  const store = loadStoreSettings();
  const till = findTill(store.activeTillId);
  const lines = [
    store.storeName,
    till ? tillLabel(till) : "",
    kind === "day" ? "DAY REPORT" : "SHIFT REPORT",
    "--------------------------------",
    shift
      ? `Cashier: ${shift.staffName}`
      : extras
        ? "No open shift"
        : "No open shift",
    shift ? `Shift ${shift.id}` : "",
    shift ? `Opened ${new Date(shift.openedAt).toLocaleString("en-NG")}` : "",
    `Printed ${when.toLocaleString("en-NG")}`,
    `Authorised by ${unlockedBy.name}`,
    "--------------------------------",
    `Tickets  ${shift?.salesCount ?? extras?.salesCount ?? 0}`,
    `Sales    ${formatMoney(shift?.salesMinor ?? extras?.salesMinor ?? 0)}`,
    "--------------------------------",
    "",
  ].filter((line) => line !== "");
  return lines.join("\n");
}

export async function printReport(content: string) {
  const printer = loadPrinterConfig().receiptPrinter;
  if (!printer) {
    return { printed: false, printer: null };
  }
  const width = loadStoreSettings().receiptPaper === "58mm" ? 58 : 80;
  await sendToPrinter(printer, content, width);
  return { printed: true, printer };
}
