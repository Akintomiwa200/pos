import { apiUrl } from "./api-base";
import { reverseRedemption } from "./redemptions";

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

export type GiftCardRedeemResult = {
  card: GiftCard;
  amountMinor: number;
  balanceAfterMinor: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json" },
    ...init,
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

export function listGiftCards(): Promise<GiftCard[]> {
  return request<GiftCard[]>("/api/customers/gift-cards");
}

/** Charge a gift card for a ticket. The backend deduplicates on ticketId. */
export function redeemGiftCard(input: {
  code: string;
  amountMinor: number;
  ticketId: string;
}) {
  return request<GiftCardRedeemResult>("/api/customers/gift-cards/redeem", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Restore a gift-card balance after an incomplete sale. */
export function reverseGiftCard(ticketId: string) {
  return request<{ ok: boolean; reversed: boolean; ticketId: string }>(
    "/api/customers/gift-cards/reverse",
    {
      method: "POST",
      body: JSON.stringify({ ticketId }),
    },
  );
}

export { reverseRedemption };
