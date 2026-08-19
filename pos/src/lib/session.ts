import { formatMoney } from "./types";
import { loadStoreSettings } from "./store-settings";
import { findTill, tillLabel } from "./tills";
import { loadPrinterConfig, sendToPrinter } from "./printers";
import type { ShiftRecord, StaffUser } from "./staff";
import { DEMO_STAFF, isSellOnly, publicUser } from "./staff";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
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
  try {
    return await post<{
      user: StaffUser;
      needsOpenShift: boolean;
    }>("/api/auth/login", { username, password });
  } catch {
    const name = username.trim().toLowerCase();
    const match = DEMO_STAFF.find(
      (staff) =>
        staff.password === password &&
        (staff.username.toLowerCase() === name ||
          staff.email.toLowerCase() === name),
    );
    if (!match) throw new Error("Wrong username or password.");
    const user = publicUser(match);
    return {
      user,
      needsOpenShift: isSellOnly(user),
    };
  }
}

export async function listStaff() {
  try {
    const response = await fetch("/api/staff");
    if (!response.ok) throw new Error("fail");
    return (await response.json()) as StaffUser[];
  } catch {
    return DEMO_STAFF.map(publicUser);
  }
}

export async function unlockWithPin(pin: string) {
  try {
    return await post<StaffUser>("/api/staff/unlock", { pin });
  } catch {
    const match = DEMO_STAFF.find(
      (staff) => staff.pin === pin && staff.privileges.includes("unlock"),
    );
    if (!match) throw new Error("This PIN cannot unlock that action.");
    return publicUser(match);
  }
}

export async function openShift(staffId: string) {
  try {
    return await post<ShiftRecord>("/api/staff/shift/open", { staffId });
  } catch {
    return {
      id: `SH-${Date.now().toString().slice(-8)}`,
      staffId,
      staffName: DEMO_STAFF.find((staff) => staff.id === staffId)?.name ?? "",
      openedAt: new Date().toISOString(),
      closedAt: null,
      salesCount: 0,
      salesMinor: 0,
    } satisfies ShiftRecord;
  }
}

export async function closeShift(staffId: string, pin: string) {
  await unlockWithPin(pin);
  try {
    return await post<ShiftRecord | null>("/api/staff/shift/close", {
      staffId,
      pin,
    });
  } catch {
    return null;
  }
}

export async function recordShiftSale(staffId: string, amountMinor: number) {
  try {
    await post("/api/staff/shift/sale", { staffId, amountMinor });
  } catch {
    // local till still works if the API is down
  }
}

export async function closeDay(pin: string) {
  await unlockWithPin(pin);
  try {
    return await post<{ closedAt: string }>("/api/staff/day/close", { pin });
  } catch {
    return { closedAt: new Date().toISOString() };
  }
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
  await sendToPrinter(printer, content);
  return { printed: true, printer };
}
