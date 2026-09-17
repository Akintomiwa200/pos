export const TILL_STORAGE_KEYS = [
  "pos.tills.v1",
  "pos.branches.v1",
  "pos.stores.v1",
  "pos.store-settings.v1",
  "pos.sales.v1",
  "pos.sales.outbox.v1",
  "pos.customers.v1",
  "pos.printer-config.v1",
];

export function resetTerminalState() {
  const known = new Set(TILL_STORAGE_KEYS);
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (known.has(key) || key.startsWith("pos.")) {
      localStorage.removeItem(key);
    }
  }
  window.dispatchEvent(new Event("pos-settings"));
  window.dispatchEvent(new Event("pos-tills"));
}