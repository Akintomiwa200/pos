const KEY = "pos.customers.v1";

export type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export function loadCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomerRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomers(rows: CustomerRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}
