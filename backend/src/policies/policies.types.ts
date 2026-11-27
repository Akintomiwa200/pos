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
  | "accountData"
  | "supportTickets"
  | "supportRequests"
  | "knowledgeArticles"
  | "announcements"
  | "systemSettings"
  | "systemAlerts"
  | "featureFlags"
  | "backups"
  | "apiKeys"
  | "webhooks"
  | "apps"
  | "apiLogs"
  | "adminActivity"
  | "discountCodes";

export type PolicyRecord = { id: string; [key: string]: unknown };

export type PoliciesStore = Record<PolicyKind, PolicyRecord[]>;

export const POLICY_KINDS: PolicyKind[] = [
  "businesses",
  "roles",
  "bankAccounts",
  "expenseControls",
  "reconciliations",
  "assetDefaults",
  "productionPolicies",
  "stockPolicies",
  "approvals",
  "integrations",
  "notificationChannels",
  "notificationHistory",
  "archives",
  "offlineSyncs",
  "bulkRuns",
  "historicalSyncs",
  "sharedDevices",
  "accountData",
  "supportTickets",
  "supportRequests",
  "knowledgeArticles",
  "announcements",
  "systemSettings",
  "systemAlerts",
  "featureFlags",
  "backups",
  "apiKeys",
  "webhooks",
  "apps",
  "apiLogs",
  "adminActivity",
  "discountCodes",
];

export function emptyPolicies(): PoliciesStore {
  return Object.fromEntries(
    POLICY_KINDS.map((kind) => [kind, [] as PolicyRecord[]]),
  ) as PoliciesStore;
}

export function isPolicyKind(value: string): value is PolicyKind {
  return (POLICY_KINDS as string[]).includes(value);
}