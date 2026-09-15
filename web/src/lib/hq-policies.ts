import { api } from "./hq-api";

export type PolicyKind =
  | "businesses"
  | "roles"
  | "bankAccounts"
  | "expenseControls"
  | "reconciliations"
  | "assetDefaults"
  | "productionPolicies"
  | "stockPolicies"
  | "approvals"
  | "integrations"
  | "notificationChannels"
  | "notificationHistory"
  | "archives"
  | "offlineSyncs"
  | "bulkRuns"
  | "historicalSyncs"
  | "sharedDevices"
  | "accountData";

export type PolicyRecord = { id: string; [key: string]: unknown };

export async function listPolicies(kind: PolicyKind) {
  return api<PolicyRecord[]>(`/api/policies/${kind}`);
}

export async function savePolicy(kind: PolicyKind, body: Partial<PolicyRecord>) {
  return api<PolicyRecord>(`/api/policies/${kind}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deletePolicy(kind: PolicyKind, id: string) {
  await api(`/api/policies/${kind}/${id}`, { method: "DELETE" });
}

export async function resetPolicies(kind: PolicyKind) {
  await api(`/api/policies/${kind}`, { method: "DELETE" });
}

export function asStr(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

export function asNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function asBool(value: unknown) {
  return value === true || value === "true" || value === 1;
}