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

/** Add or update a customer, matching on phone (or email when phone is blank). */
export function upsertCustomer(input: CustomerRecord): CustomerRecord[] {
  const rows = loadCustomers();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const existing = rows.find((row) =>
    phone
      ? row.phone.trim() === phone
      : Boolean(email) && row.email.trim().toLowerCase() === email,
  );
  const record: CustomerRecord = {
    id: existing?.id ?? `cu-${Date.now().toString(36)}`,
    name: input.name.trim() || (existing?.name ?? ""),
    phone,
    email: input.email.trim(),
  };
  const next = existing
    ? rows.map((row) => (row.id === existing.id ? record : row))
    : [record, ...rows];
  saveCustomers(next);
  return next;
}
