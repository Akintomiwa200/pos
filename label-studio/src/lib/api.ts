const API_BASE_KEY = "label-studio:api-base";

export function getApiBase() {
  try {
    const saved = window.localStorage.getItem(API_BASE_KEY);
    if (saved) return saved.replace(/\/$/, "");
  } catch {
    // localStorage can be unavailable in private/kiosk modes.
  }
  return (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
}

export function setApiBase(value: string) {
  const clean = value.trim().replace(/\/$/, "");
  try {
    if (clean) window.localStorage.setItem(API_BASE_KEY, clean);
    else window.localStorage.removeItem(API_BASE_KEY);
  } catch {
    // Keep the in-memory value even if persistence is unavailable.
  }
}

export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${p}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error("Backend is not reachable. Check the POS server address in Settings.");
  }
  const data = (await response.json().catch(() => ({}))) as T & { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "Request failed");
  }
  return data;
}
