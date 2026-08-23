import { api } from "./hq-api";

export type CustomerCredit = {
  id: string;
  customerId: string;
  customerName: string;
  limitMinor: number;
  balanceMinor: number;
  terms: string;
  active: boolean;
};

export type CustomerCreditRule = {
  id: string;
  name: string;
  maxDays: number;
  maxBalanceMinor: number;
  requireApproval: boolean;
  note: string;
  active: boolean;
};

export type LoyaltyProgram = {
  enabled: boolean;
  earnPerNaira: number;
  redeemValueMinor: number;
  minDigits: number;
  allowSkip: boolean;
  autoApply: boolean;
  prompt: "phone" | "card" | "either";
  welcomeBonusPoints: number;
};

export type LoyaltyMember = {
  id: string;
  customerId?: string;
  name: string;
  phone: string;
  email?: string;
  cardNumber?: string;
  points: number;
  registeredAt: string;
  active: boolean;
};

export type LoyaltyCard = {
  id: string;
  memberId: string;
  memberName: string;
  cardNumber: string;
  tier: string;
  issuedAt: string;
  active: boolean;
};

export type GiftCard = {
  id: string;
  code: string;
  balanceMinor: number;
  initialMinor: number;
  customerId?: string;
  customerName?: string;
  batchId?: string;
  expiresAt?: string;
  active: boolean;
};

export type GiftCardBatch = {
  id: string;
  name: string;
  count: number;
  amountMinor: number;
  createdAt: string;
  note?: string;
};

export type CustomerGroup = {
  id: string;
  name: string;
  note: string;
  active: boolean;
};

export async function getLoyaltyProgram() {
  return api<LoyaltyProgram>("/api/customers/loyalty/program");
}

export async function saveLoyaltyProgram(body: Partial<LoyaltyProgram>) {
  return api<LoyaltyProgram>("/api/customers/loyalty/program", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listCredits() {
  return api<CustomerCredit[]>("/api/customers/credits");
}

export async function saveCredit(body: Partial<CustomerCredit> & { id?: string }) {
  return api<CustomerCredit>("/api/customers/credits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCredit(id: string) {
  await api(`/api/customers/credits/${id}`, { method: "DELETE" });
}

export async function listCreditRules() {
  return api<CustomerCreditRule[]>("/api/customers/credit-rules");
}

export async function saveCreditRule(body: Partial<CustomerCreditRule> & { id?: string }) {
  return api<CustomerCreditRule>("/api/customers/credit-rules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCreditRule(id: string) {
  await api(`/api/customers/credit-rules/${id}`, { method: "DELETE" });
}

export async function listLoyaltyMembers() {
  return api<LoyaltyMember[]>("/api/customers/loyalty/members");
}

export async function saveLoyaltyMember(body: Partial<LoyaltyMember> & { id?: string }) {
  return api<LoyaltyMember>("/api/customers/loyalty/members", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteLoyaltyMember(id: string) {
  await api(`/api/customers/loyalty/members/${id}`, { method: "DELETE" });
}

export async function listLoyaltyCards() {
  return api<LoyaltyCard[]>("/api/customers/loyalty/cards");
}

export async function saveLoyaltyCard(body: Partial<LoyaltyCard> & { id?: string }) {
  return api<LoyaltyCard>("/api/customers/loyalty/cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteLoyaltyCard(id: string) {
  await api(`/api/customers/loyalty/cards/${id}`, { method: "DELETE" });
}

export async function listGiftCards() {
  return api<GiftCard[]>("/api/customers/gift-cards");
}

export async function saveGiftCard(body: Partial<GiftCard> & { id?: string }) {
  return api<GiftCard>("/api/customers/gift-cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteGiftCard(id: string) {
  await api(`/api/customers/gift-cards/${id}`, { method: "DELETE" });
}

export async function listGiftBatches() {
  return api<GiftCardBatch[]>("/api/customers/gift-batches");
}

export async function saveGiftBatch(body: Partial<GiftCardBatch> & { id?: string }) {
  return api<GiftCardBatch>("/api/customers/gift-batches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteGiftBatch(id: string) {
  await api(`/api/customers/gift-batches/${id}`, { method: "DELETE" });
}

export async function listCustomerGroups() {
  return api<CustomerGroup[]>("/api/customers/groups");
}

export async function saveCustomerGroup(body: Partial<CustomerGroup> & { id?: string }) {
  return api<CustomerGroup>("/api/customers/groups", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCustomerGroup(id: string) {
  await api(`/api/customers/groups/${id}`, { method: "DELETE" });
}
