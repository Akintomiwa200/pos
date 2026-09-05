import {
  SESSION_KEY,
  type ConsoleAccount,
  type ConsoleGroup,
  type ConsoleSession,
} from "./access";
import { NetworkError, resolveUserMessage } from "./errors";
import { isDefaultGroupId } from "./hq-seed";

export { NetworkError } from "./errors";

export function authErrorMessage(err: unknown, fallback: string) {
  return resolveUserMessage(err, fallback);
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

export type CompanySignupInput = {
  company: {
    name: string;
    legalName?: string;
    email?: string;
    phone?: string;
    state?: string;
    country?: string;
    currency?: string;
  };
  account: {
    name: string;
    email: string;
    username: string;
    password: string;
  };
};

export async function registerCompanyConsole(
  input: CompanySignupInput,
): Promise<ConsoleSession> {
  const data = await api<{ token: string; user: Omit<ConsoleSession, "token"> }>(
    "/api/console/register-company",
    { method: "POST", body: JSON.stringify(input) },
  );
  return asSession(data);
}

export async function provisionCompanyConsole(
  token: string,
  input: CompanySignupInput,
) {
  return api<{
    company: { id: string; name: string; email?: string };
    owner: { id: string; name: string; email: string; username: string } | null;
  }>("/api/console/admin/companies", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export async function fetchGoogleAuthConfig() {
  return api<{ enabled: boolean; clientId: string | null }>("/api/console/auth/google-config");
}

export async function googleAuthConsole(input: {
  credential: string;
  intent: "login" | "signup";
  company?: CompanySignupInput["company"];
}): Promise<ConsoleSession> {
  const data = await api<{ token: string; user: Omit<ConsoleSession, "token"> }>(
    "/api/console/auth/google",
    { method: "POST", body: JSON.stringify(input) },
  );
  return asSession(data);
}

export async function forgotPassword(email: string) {
  return api<{ ok: true; resetToken?: string; emailSent?: boolean }>(
    "/api/console/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
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
  subcategory?: string;
  sku: string;
  barcode: string;
  batchNumber?: string;
  brand?: string;
  costMinor: number;
  priceMinor: number;
  onHand: number;
  reorderLevel: number;
  unit: string;
  unitLabel?: string;
  packSize: number;
  description?: string;
  active: boolean;
  image?: string;
  expiresAt?: string;
};

export async function listCatalog(): Promise<HqCatalogItem[]> {
  try {
    return await api<HqCatalogItem[]>("/api/catalog/items");
  } catch {
    return [];
  }
}

export async function deleteCatalogItem(id: string) {
  return api<{ ok: true; id: string }>(
    `/api/catalog/items/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function uploadProductImage(itemId: string, file: File): Promise<HqCatalogItem> {
  const form = new FormData();
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(`/api/console/setup/catalog/items/${encodeURIComponent(itemId)}/image`, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
  } catch {
    throw new NetworkError();
  }
  const data = (await response.json().catch(() => ({}))) as HqCatalogItem & {
    message?: string | string[];
  };
  if (!response.ok) {
    if (response.status >= 500) throw new NetworkError();
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "Image upload failed");
  }
  return data;
}

export async function listGroups(): Promise<ConsoleGroup[]> {
  return api<ConsoleGroup[]>("/api/console/groups");
}

export async function saveGroup(group: ConsoleGroup): Promise<ConsoleGroup> {
  return api<ConsoleGroup>("/api/console/groups", {
    method: "POST",
    body: JSON.stringify(group),
  });
}

export async function deleteGroup(id: string) {
  if (isDefaultGroupId(id)) {
    throw new Error("Default groups cannot be deleted");
  }
  await api(`/api/console/groups/${id}`, { method: "DELETE" });
}

export async function listAccounts(): Promise<Omit<ConsoleAccount, "password">[]> {
  return api<Omit<ConsoleAccount, "password">[]>("/api/console/accounts");
}

export async function saveAccount(
  account: Partial<ConsoleAccount> & { id?: string },
): Promise<Omit<ConsoleAccount, "password">> {
  return api("/api/console/accounts", {
    method: "POST",
    body: JSON.stringify(account),
  });
}

export async function deleteAccount(id: string) {
  await api(`/api/console/accounts/${id}`, { method: "DELETE" });
}

export function refreshSessionFromGroup(
  session: ConsoleSession,
  group: ConsoleGroup,
): ConsoleSession {
  if (session.groupId !== group.id) return session;
  const next = {
    ...session,
    groupName: group.name,
    scope: group.scope ?? session.scope,
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
  branchId?: string;
  storeId?: string;
  product: TillProduct;
  active: boolean;
  hardwareHex: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  unpairedAt: string | null;
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

export const LICENCE_YEAR_MINOR = 2_500_000;

export async function unpairTill(id: string): Promise<HqTill> {
  return api<HqTill>(`/api/console/tills/${id}/unpair`, { method: "POST" });
}

export async function payTillLicense(
  id: string,
  payment: { reference: string; provider: string; amountMinor: number },
): Promise<HqTill> {
  return api<HqTill>(`/api/console/tills/${id}/renew/pay`, {
    method: "POST",
    body: JSON.stringify(payment),
  });
}

export async function deleteTill(id: string) {
  await api(`/api/console/tills/${id}`, { method: "DELETE" });
}
