const KEY = "price-check-api";

export function getApiBase() {
  const saved = localStorage.getItem(KEY)?.trim();
  if (!saved) return "";
  return saved.replace(/\/$/, "");
}

export function setApiBase(value: string) {
  const next = value.trim().replace(/\/$/, "");
  if (next) localStorage.setItem(KEY, next);
  else localStorage.removeItem(KEY);
}

export function apiUrl(path: string) {
  return `${getApiBase()}${path}`;
}
