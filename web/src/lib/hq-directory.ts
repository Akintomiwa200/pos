import { api } from "./hq-api";

export type DirectoryRecord = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  active: boolean;
  extra?: Record<string, string | number | boolean | null>;
};

export type DirectoryName =
  | "customers"
  | "vendors"
  | "sales-reps"
  | "staff"
  | "manufacturers"
  | "payment-methods"
  | "promotions"
  | "expense-accounts"
  | "item-groups"
  | "item-subgroups"
  | "units";

export async function listDirectory(name: DirectoryName): Promise<DirectoryRecord[]> {
  return api<DirectoryRecord[]>(`/api/directory/${name}`);
}

export async function saveDirectory(
  name: DirectoryName,
  record: Partial<DirectoryRecord>,
): Promise<DirectoryRecord> {
  return api<DirectoryRecord>(`/api/directory/${name}`, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function deleteDirectory(name: DirectoryName, id: string) {
  await api(`/api/directory/${name}/${id}`, { method: "DELETE" });
}
