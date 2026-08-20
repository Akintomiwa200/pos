import {
  SESSION_KEY,
  type ConsoleAccount,
  type ConsoleGroup,
  type ConsoleSession,
} from "./access";
import { SEED_ACCOUNTS, SEED_GROUPS } from "./hq-seed";

const GROUPS_KEY = "hq.groups.v1";
const ACCOUNTS_KEY = "hq.accounts.v1";

export class NetworkError extends Error {
  constructor() {
    super("Console API unavailable");
  }
}

export function authErrorMessage(err: unknown, fallback: string) {
  if (err instanceof NetworkError || (err instanceof Error && err.message === "Console API unavailable")) {
    return "HQ API is not running. Start the backend on port 3001.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return JSON.parse(raw) as T;
  } catch {
    return structuredClone(fallback);
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new NetworkError();
  }
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string | string[];
  };
  if (!response.ok) {
    if (response.status >= 500) throw new NetworkError();
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "Request failed");
  }
  return data;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function asSession(data: { token: string; user: Omit<ConsoleSession, "token"> }): ConsoleSession {
  const session: ConsoleSession = { token: data.token, ...data.user };
  writeSession(session);
  return session;
}

export function readSession(): ConsoleSession | null {
  return readLocal<ConsoleSession | null>(SESSION_KEY, null);
}

export function writeSession(session: ConsoleSession | null) {
  if (!session) window.localStorage.removeItem(SESSION_KEY);
  else writeLocal(SESSION_KEY, session);
}

export async function loginConsole(email: string, password: string): Promise<ConsoleSession> {
  const data = await api<{ token: string; user: Omit<ConsoleSession, "token"> }>(
    "/api/console/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  return asSession(data);
}

export async function registerConsole(input: {
  name: string;
  email: string;
  username: string;
  password: string;
}): Promise<ConsoleSession> {
  const data = await api<{ token: string; user: Omit<ConsoleSession, "token"> }>(
    "/api/console/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  return asSession(data);
}

export async function forgotPassword(email: string) {
  return api<{ ok: true; resetToken?: string }>("/api/console/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return api<{ ok: true }>("/api/console/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function fetchConsoleSession(token: string): Promise<ConsoleSession> {
  const data = await api<{ token: string; user: Omit<ConsoleSession, "token"> }>(
    "/api/console/me",
    { headers: authHeaders(token) },
  );
  return asSession(data);
}

export async function logoutConsole(token?: string | null) {
  if (token) {
    await api("/api/console/logout", {
      method: "POST",
      headers: authHeaders(token),
    }).catch(() => undefined);
  }
  writeSession(null);
}

export async function changePassword(token: string, current: string, password: string) {
  return api<{ ok: true }>("/api/console/password", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ current, password }),
  });
}

export type HqNotice = {
  id: string;
  key: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
  derived?: boolean;
};

export async function listNotifications(token: string) {
  return api<{ unread: number; items: HqNotice[] }>("/api/console/notifications", {
    headers: authHeaders(token),
  });
}

export async function markNotificationRead(token: string, id: string) {
  return api<HqNotice>(`/api/console/notifications/${id}/read`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function markAllNotificationsRead(token: string) {
  return api<{ ok: true }>("/api/console/notifications/read-all", {
    method: "POST",
    headers: authHeaders(token),
  });
}

export type HqSale = {
  ticketId: string;
  paidAt: string;
  tender: string;
  cashierName: string;
  totalMinor: number;
  lines?: Array<{
    id?: string;
    itemId?: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
  }>;
};

export async function listSales(): Promise<HqSale[]> {
  try {
    return await api<HqSale[]>("/api/sales");
  } catch {
    return [];
  }
}

export type HqCatalogItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  priceMinor: number;
  onHand: number;
  expiresAt?: string;
};

export async function listCatalog(): Promise<HqCatalogItem[]> {
  try {
    return await api<HqCatalogItem[]>("/api/catalog/items");
  } catch {
    return [];
  }
}

export async function listGroups(): Promise<ConsoleGroup[]> {
  try {
    return await api<ConsoleGroup[]>("/api/console/groups");
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const groups = readLocal(GROUPS_KEY, SEED_GROUPS);
    if (!window.localStorage.getItem(GROUPS_KEY)) writeLocal(GROUPS_KEY, groups);
    return groups;
  }
}

export async function saveGroup(group: ConsoleGroup): Promise<ConsoleGroup> {
  try {
    return await api<ConsoleGroup>("/api/console/groups", {
      method: "POST",
      body: JSON.stringify(group),
    });
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const groups = readLocal(GROUPS_KEY, SEED_GROUPS);
    const next = { ...group, id: group.id || `g-${Date.now()}` };
    const index = groups.findIndex((row) => row.id === next.id);
    if (index >= 0) groups[index] = next;
    else groups.push(next);
    writeLocal(GROUPS_KEY, groups);
    return next;
  }
}

export async function deleteGroup(id: string) {
  try {
    await api(`/api/console/groups/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const accounts = readLocal(ACCOUNTS_KEY, SEED_ACCOUNTS);
    if (accounts.some((row) => row.groupId === id)) {
      throw new Error("Reassign accounts before deleting this group");
    }
    writeLocal(
      GROUPS_KEY,
      readLocal(GROUPS_KEY, SEED_GROUPS).filter((row) => row.id !== id),
    );
  }
}

export async function listAccounts(): Promise<Omit<ConsoleAccount, "password">[]> {
  try {
    return await api<Omit<ConsoleAccount, "password">[]>("/api/console/accounts");
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const accounts = readLocal(ACCOUNTS_KEY, SEED_ACCOUNTS);
    if (!window.localStorage.getItem(ACCOUNTS_KEY)) writeLocal(ACCOUNTS_KEY, accounts);
    return accounts.map(({ password: _password, ...rest }) => rest);
  }
}

export async function saveAccount(
  account: Partial<ConsoleAccount> & { id?: string },
): Promise<Omit<ConsoleAccount, "password">> {
  try {
    return await api("/api/console/accounts", {
      method: "POST",
      body: JSON.stringify(account),
    });
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const accounts = readLocal(ACCOUNTS_KEY, SEED_ACCOUNTS);
    const existing = account.id ? accounts.find((row) => row.id === account.id) : undefined;
    const next: ConsoleAccount = {
      id: existing?.id ?? `a-${Date.now()}`,
      name: account.name?.trim() || "",
      email: account.email?.trim().toLowerCase() || "",
      username: account.username?.trim().toLowerCase() || "",
      password: account.password?.trim() || existing?.password || "demo",
      groupId: account.groupId || "",
      active: account.active ?? existing?.active ?? true,
    };
    const duplicate = accounts.find(
      (row) =>
        row.id !== next.id &&
        (row.email === next.email || row.username === next.username),
    );
    if (!next.name || !next.email || !next.username || !next.groupId) {
      throw new Error("Name, email, username, and group are required");
    }
    if (duplicate) throw new Error("Email or username already in use");
    const updated = existing
      ? accounts.map((row) => (row.id === existing.id ? next : row))
      : [...accounts, next];
    writeLocal(ACCOUNTS_KEY, updated);
    const { password: _password, ...rest } = next;
    return rest;
  }
}

export async function deleteAccount(id: string) {
  try {
    await api(`/api/console/accounts/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    writeLocal(
      ACCOUNTS_KEY,
      readLocal(ACCOUNTS_KEY, SEED_ACCOUNTS).filter((row) => row.id !== id),
    );
  }
}

export function refreshSessionFromGroup(
  session: ConsoleSession,
  group: ConsoleGroup,
): ConsoleSession {
  if (session.groupId !== group.id) return session;
  const next = {
    ...session,
    groupName: group.name,
    departments: group.departments,
    privileges: group.privileges,
  };
  writeSession(next);
  return next;
}

export type TillProduct = "supermarket" | "hotel" | "restaurant" | "dark-kitchen";

export const TILL_PRODUCTS: { id: TillProduct; label: string }[] = [
  { id: "supermarket", label: "Supermarket" },
  { id: "hotel", label: "Hotel" },
  { id: "restaurant", label: "Restaurant" },
  { id: "dark-kitchen", label: "Dark kitchen" },
];

export function tillProductLabel(value?: string | null) {
  const id =
    value === "hotel" || value === "restaurant" || value === "dark-kitchen"
      ? value
      : "supermarket";
  return TILL_PRODUCTS.find((row) => row.id === id)?.label ?? "Supermarket";
}

export type HqTill = {
  id: string;
  name: string;
  code: string;
  branchName: string;
  product: TillProduct;
  active: boolean;
  hardwareHex: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  subscriptionExpiresAt: string | null;
  online?: boolean;
  expired?: boolean;
};

export async function listTills(): Promise<HqTill[]> {
  try {
    return await api<HqTill[]>("/api/console/tills");
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    return [];
  }
}

export async function saveTill(till: Partial<HqTill>): Promise<HqTill> {
  return api<HqTill>("/api/console/tills", {
    method: "POST",
    body: JSON.stringify(till),
  });
}

export async function regenerateTillCode(id: string): Promise<HqTill> {
  return api<HqTill>(`/api/console/tills/${id}/regenerate`, { method: "POST" });
}

export async function renewTill(id: string): Promise<HqTill> {
  return api<HqTill>(`/api/console/tills/${id}/renew`, { method: "POST" });
}

export async function deleteTill(id: string) {
  await api(`/api/console/tills/${id}`, { method: "DELETE" });
}
