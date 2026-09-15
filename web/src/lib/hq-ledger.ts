import { api } from "./hq-api";

export type LedgerAccount = {
  id: string;
  code: string;
  name: string;
  kind: "asset" | "liability" | "equity" | "income" | "expense";
  openingMinor: number;
  active: boolean;
  group: string;
};

export type LedgerJournalLine = {
  accountId: string;
  accountName: string;
  debitMinor: number;
  creditMinor: number;
};

export type LedgerJournalEntry = {
  id: string;
  number: string;
  date: string;
  memo: string;
  lines: LedgerJournalLine[];
  createdAt: string;
};

export type LedgerFixedAsset = {
  id: string;
  name: string;
  category: string;
  costMinor: number;
  salvageMinor: number;
  lifeYears: number;
  acquiredAt: string;
  lastDepreciatedAt?: string;
  note?: string;
};

export type LedgerPrepaid = {
  id: string;
  name: string;
  amountMinor: number;
  startedAt: string;
  months: number;
  consumedMinor: number;
  note?: string;
};

export type LedgerAdvance = {
  id: string;
  customerId?: string;
  customerName: string;
  amountMinor: number;
  appliedMinor: number;
  at: string;
  note?: string;
};

export type StoreTarget = {
  id: string;
  period: string;
  storeId: string;
  storeName: string;
  targetMinor: number;
};

export type StaffTarget = {
  id: string;
  period: string;
  staffId?: string;
  staffName: string;
  targetMinor: number;
};

export async function listLedgerAccounts() {
  return api<LedgerAccount[]>("/api/ledger/accounts");
}
export async function saveLedgerAccount(body: Partial<LedgerAccount>) {
  return api<LedgerAccount>("/api/ledger/accounts", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteLedgerAccount(id: string) {
  await api(`/api/ledger/accounts/${id}`, { method: "DELETE" });
}

export async function listJournalEntries() {
  return api<LedgerJournalEntry[]>("/api/ledger/journal");
}
export async function saveJournalEntry(body: Partial<LedgerJournalEntry>) {
  return api<LedgerJournalEntry>("/api/ledger/journal", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteJournalEntry(id: string) {
  await api(`/api/ledger/journal/${id}`, { method: "DELETE" });
}

export async function listFixedAssets() {
  return api<LedgerFixedAsset[]>("/api/ledger/fixed-assets");
}
export async function saveFixedAsset(body: Partial<LedgerFixedAsset>) {
  return api<LedgerFixedAsset>("/api/ledger/fixed-assets", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteFixedAsset(id: string) {
  await api(`/api/ledger/fixed-assets/${id}`, { method: "DELETE" });
}

export async function listPrepaids() {
  return api<LedgerPrepaid[]>("/api/ledger/prepaids");
}
export async function savePrepaid(body: Partial<LedgerPrepaid>) {
  return api<LedgerPrepaid>("/api/ledger/prepaids", { method: "POST", body: JSON.stringify(body) });
}
export async function deletePrepaid(id: string) {
  await api(`/api/ledger/prepaids/${id}`, { method: "DELETE" });
}

export async function listAdvances() {
  return api<LedgerAdvance[]>("/api/ledger/advances");
}
export async function saveAdvance(body: Partial<LedgerAdvance>) {
  return api<LedgerAdvance>("/api/ledger/advances", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteAdvance(id: string) {
  await api(`/api/ledger/advances/${id}`, { method: "DELETE" });
}

export async function listStoreTargets() {
  return api<StoreTarget[]>("/api/ledger/store-targets");
}
export async function saveStoreTarget(body: Partial<StoreTarget>) {
  return api<StoreTarget>("/api/ledger/store-targets", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteStoreTarget(id: string) {
  await api(`/api/ledger/store-targets/${id}`, { method: "DELETE" });
}

export async function listStaffTargets() {
  return api<StaffTarget[]>("/api/ledger/staff-targets");
}
export async function saveStaffTarget(body: Partial<StaffTarget>) {
  return api<StaffTarget>("/api/ledger/staff-targets", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteStaffTarget(id: string) {
  await api(`/api/ledger/staff-targets/${id}`, { method: "DELETE" });
}