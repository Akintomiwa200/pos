import { apiUrl } from "./api-base";
import type { LoyaltyMember } from "./loyalty";

export type LoyaltyRedeemResult = {
  member: LoyaltyMember;
  pointsRedeemed: number;
  valueMinor: number;
  balanceBefore: number;
  balanceAfter: number;
};

export type ReverseResult = { ok: boolean; reversed: boolean; ticketId: string };

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string | string[];
  };
  if (!response.ok) {
    const message = data.message;
    throw new Error(
      Array.isArray(message) ? (message[0] ?? "Request failed") : message || "Request failed",
    );
  }
  return data;
}

/** Redeem points for a ticket. The backend deduplicates on ticketId. */
export function redeemLoyalty(input: {
  memberId?: string;
  identifier?: string;
  points: number;
  ticketId: string;
}) {
  return post<LoyaltyRedeemResult>("/api/customers/loyalty/redeem", input);
}

/** Restore points or gift-card balance after an incomplete sale. */
export function reverseRedemption(ticketId: string) {
  return post<ReverseResult>("/api/customers/loyalty/reverse", { ticketId });
}
