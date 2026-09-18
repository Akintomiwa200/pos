import { apiUrl } from "./api-base";
import { loadStoreSettings, saveStoreSettings } from "./store-settings";

export type LoyaltyPrompt = "card" | "phone" | "either";

export type LoyaltyProgram = {
  enabled: boolean;
  earnPerNaira: number;
  redeemValueMinor: number;
  minDigits: number;
  allowSkip: boolean;
  autoApply: boolean;
  prompt: LoyaltyPrompt;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(
      Array.isArray((data as { message?: string[] }).message)
        ? "Request failed"
        : ((data as { message?: string }).message ?? "Request failed"),
    );
  }
  return data;
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getLoyaltyProgram() {
  return request<LoyaltyProgram>("/api/customers/loyalty/program");
}

export function saveLoyaltyProgram(input: Partial<LoyaltyProgram>) {
  return post<LoyaltyProgram>("/api/customers/loyalty/program", input);
}

export function listLoyaltyMembers() {
  return request<LoyaltyMember[]>("/api/customers/loyalty/members");
}

export function saveLoyaltyMember(
  input: Partial<LoyaltyMember> & { id?: string },
) {
  return post<LoyaltyMember>("/api/customers/loyalty/members", input);
}

export function deleteLoyaltyMember(id: string) {
  return request<{ ok: boolean }>(`/api/customers/loyalty/members/${id}`, {
    method: "DELETE",
  });
}

export function listLoyaltyCards() {
  return request<LoyaltyCard[]>("/api/customers/loyalty/cards");
}

export function saveLoyaltyCard(input: Partial<LoyaltyCard> & { id?: string }) {
  return post<LoyaltyCard>("/api/customers/loyalty/cards", input);
}

export function deleteLoyaltyCard(id: string) {
  return request<{ ok: boolean }>(`/api/customers/loyalty/cards/${id}`, {
    method: "DELETE",
  });
}

export function applyProgramToTill(program: LoyaltyProgram) {
  const settings = loadStoreSettings();
  saveStoreSettings({
    ...settings,
    loyaltyEnabled: program.enabled,
    loyaltyAllowSkip: program.allowSkip,
    loyaltyMinDigits: program.minDigits,
    loyaltyPrompt: program.prompt,
    loyaltyEarnNaira: program.earnPerNaira,
    loyaltyRedeemMinor: program.redeemValueMinor,
    loyaltyAutoApply: program.autoApply,
  });
}

export async function syncLoyaltyProgram() {
  const program = await getLoyaltyProgram();
  applyProgramToTill(program);
  return program;
}