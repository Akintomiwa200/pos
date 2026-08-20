import { SETTINGS_EVENT, loadStoreSettings, saveStoreSettings } from "./store-settings";
import { addOneYear, isSubscriptionExpired, normalizeTillProduct, type TillProduct } from "./till-code";
import { apiUrl } from "./api-base";

const KEY = "pos.tills.v1";
const BRANCH_KEY = "pos.branches.v1";
export const TILLS_EVENT = "pos-tills";
export const TILL_TAKEN_EVENT = "pos-till-taken";
export const TILL_EXPIRED_EVENT = "pos-till-expired";

export type BranchRecord = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  manager: string;
  active: boolean;
};

export type TillType = "counter" | "kiosk" | "mobile";

export type TillRecord = {
  id: string;
  name: string;
  code: string;
  paired: boolean;
  sessionToken: string;
  branchId: string;
  active: boolean;
  type: TillType;
  notes: string;
  lastOpenedAt: string | null;
  subscriptionExpiresAt: string | null;
  product: TillProduct;
};

export function defaultBranches(): BranchRecord[] {
  return [
    {
      id: "br-vi",
      name: "Victoria Island",
      address: "14 Adeola Odeku Street",
      city: "Lagos",
      state: "Lagos",
      phone: "+234 801 234 5678",
      manager: "Chika Obi",
      active: true,
    },
    {
      id: "br-ikeja",
      name: "Ikeja",
      address: "Allen Avenue",
      city: "Ikeja",
      state: "Lagos",
      phone: "+234 802 111 2233",
      manager: "Emma Bello",
      active: true,
    },
  ];
}

export function defaultDeviceTill(): TillRecord {
  return {
    id: "device-till",
    name: "",
    code: "",
    paired: false,
    sessionToken: "",
    branchId: "br-vi",
    active: true,
    type: "counter",
    notes: "",
    lastOpenedAt: null,
    subscriptionExpiresAt: null,
    product: "supermarket",
  };
}

export function defaultTills(): TillRecord[] {
  return [defaultDeviceTill()];
}

function migrateBranch(row: Partial<BranchRecord> & { id: string; name: string }): BranchRecord {
  const fallback = defaultBranches().find((item) => item.id === row.id);
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? fallback?.address ?? "",
    city: row.city ?? fallback?.city ?? "",
    state: row.state ?? fallback?.state ?? "Lagos",
    phone: row.phone ?? fallback?.phone ?? "",
    manager: row.manager ?? fallback?.manager ?? "",
    active: row.active ?? true,
  };
}

function looksLikeTillName(value: string) {
  return /^TILL[-_]/i.test(value.trim());
}

function migrateTill(row: Partial<TillRecord> & { id: string } & { key?: string }): TillRecord {
  const fallback = defaultDeviceTill();
  const legacyKey = typeof row.key === "string" ? row.key : "";
  const name =
    row.name && !/^counter/i.test(row.name)
      ? row.name
      : looksLikeTillName(legacyKey)
        ? legacyKey
        : (row.name ?? "");
  const code = (row.code ?? "").toUpperCase();
  const paired = Boolean(row.paired && code);
  return {
    id: row.id || fallback.id,
    name: name.trim().toUpperCase(),
    code,
    paired,
    sessionToken: row.sessionToken ?? "",
    branchId: row.branchId ?? fallback.branchId,
    active: row.active ?? true,
    type: row.type ?? "counter",
    notes: row.notes ?? "",
    lastOpenedAt: row.lastOpenedAt ?? null,
    subscriptionExpiresAt: row.subscriptionExpiresAt ?? null,
    product: normalizeTillProduct(row.product),
  };
}

function readList<T>(storageKey: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  window.dispatchEvent(new Event(TILLS_EVENT));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function loadBranches(): BranchRecord[] {
  return readList<Partial<BranchRecord> & { id: string; name: string }>(
    BRANCH_KEY,
    defaultBranches(),
  ).map(migrateBranch);
}

export function saveBranches(rows: BranchRecord[]) {
  localStorage.setItem(BRANCH_KEY, JSON.stringify(rows));
  emit();
}

function readStoredTills(): TillRecord[] {
  return readList<Partial<TillRecord> & { id: string; key?: string }>(
    KEY,
    defaultTills(),
  ).map(migrateTill);
}

export function loadDeviceTill(): TillRecord {
  const list = readStoredTills();
  let till = defaultDeviceTill();
  if (list.length === 1) till = list[0]!;
  else if (list.length > 1) {
    const preferred = loadStoreSettings().activeTillId;
    till = list.find((row) => row.id === preferred) ?? list[0]!;
  }
  if (list.length !== 1) {
    localStorage.setItem(KEY, JSON.stringify([till]));
  }
  return till;
}

export function saveDeviceTill(till: TillRecord) {
  localStorage.setItem(KEY, JSON.stringify([till]));
  const settings = loadStoreSettings();
  if (settings.activeTillId !== till.id) {
    saveStoreSettings({ ...settings, activeTillId: till.id });
  }
  emit();
}

export function loadTills(): TillRecord[] {
  return [loadDeviceTill()];
}

export function saveTills(rows: TillRecord[]) {
  saveDeviceTill(rows[0] ?? loadDeviceTill());
}

export function findTill(_id?: string | null) {
  return loadDeviceTill();
}

export function findBranch(id: string) {
  return loadBranches().find((row) => row.id === id) ?? null;
}

export function tillLabel(till: TillRecord | null) {
  if (!till?.name) return "Till not activated";
  const branch = findBranch(till.branchId);
  return `${till.name}${branch ? ` · ${branch.name}` : ""}`;
}

export function tillNeedsActivation(till: TillRecord) {
  if (till.subscriptionExpiresAt && isSubscriptionExpired(till.subscriptionExpiresAt)) {
    return true;
  }
  if (!till.paired || !till.sessionToken) {
    return !till.subscriptionExpiresAt;
  }
  return false;
}

export function revokeDeviceTill() {
  const current = loadDeviceTill();
  saveDeviceTill({
    ...current,
    paired: false,
    sessionToken: "",
  });
  window.dispatchEvent(
    new CustomEvent(TILL_TAKEN_EVENT, {
      detail: "This till is in use on another device. You have been signed out.",
    }),
  );
}

export function expireDeviceSubscription(message?: string) {
  const current = loadDeviceTill();
  saveDeviceTill({
    ...current,
    subscriptionExpiresAt: new Date(0).toISOString(),
  });
  window.dispatchEvent(
    new CustomEvent(TILL_EXPIRED_EVENT, {
      detail:
        message ||
        "Till subscription has ended. Enter the till code to renew for another year.",
    }),
  );
}

export async function activateDeviceTill(code: string, hardwareHex: string) {
  const response = await fetch(apiUrl("/api/console/tills/activate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, hardwareHex }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    name?: string;
    code?: string;
    branchName?: string;
    product?: string;
    sessionToken?: string;
    subscriptionExpiresAt?: string | null;
    message?: string | string[];
  };
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(message || "Till code was rejected");
  }
  const current = loadDeviceTill();
  const branch = loadBranches().find(
    (row) => row.name.toLowerCase() === (body.branchName ?? "").toLowerCase(),
  );
  const next: TillRecord = {
    ...current,
    name: (body.name ?? current.name).toUpperCase(),
    code: (body.code ?? code).toUpperCase(),
    sessionToken: body.sessionToken ?? "",
    paired: Boolean(body.sessionToken),
    branchId: branch?.id ?? current.branchId,
    active: true,
    product: normalizeTillProduct(body.product),
    subscriptionExpiresAt: body.subscriptionExpiresAt ?? addOneYear().toISOString(),
  };
  saveDeviceTill(next);
  return next;
}

export async function heartbeatDeviceTill(hardwareHex: string) {
  const till = loadDeviceTill();
  if (!till.paired || !till.code || tillNeedsActivation(till)) return { taken: false as const, expired: false as const };
  try {
    const response = await fetch(apiUrl("/api/console/tills/heartbeat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: till.code,
        hardwareHex,
        sessionToken: till.sessionToken,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      sessionToken?: string;
      subscriptionExpiresAt?: string | null;
      product?: string;
      code?: string;
      message?: string | string[];
    };
    if (response.status === 409 || body.code === "TILL_TAKEN") {
      revokeDeviceTill();
      return { taken: true as const, expired: false as const };
    }
    if (response.status === 403) {
      const message = Array.isArray(body.message) ? body.message[0] : body.message;
      expireDeviceSubscription(message);
      return { taken: false as const, expired: true as const };
    }
    if (!response.ok) return { taken: false as const, expired: false as const };
    const nextExpires = body.subscriptionExpiresAt ?? till.subscriptionExpiresAt;
    const nextProduct = body.product ? normalizeTillProduct(body.product) : till.product;
    if (
      (body.sessionToken && body.sessionToken !== till.sessionToken) ||
      nextExpires !== till.subscriptionExpiresAt ||
      nextProduct !== till.product
    ) {
      saveDeviceTill({
        ...till,
        sessionToken: body.sessionToken ?? till.sessionToken,
        paired: true,
        subscriptionExpiresAt: nextExpires,
        product: nextProduct,
      });
    }
  } catch {
    /* HQ offline — this device keeps the till until HQ is reachable */
  }
  return { taken: false as const, expired: false as const };
}
