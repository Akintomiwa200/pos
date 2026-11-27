import { apiUrl } from "./api-base";

export type PaymentProvider = "paystack" | "flutterwave" | "moniepoint" | "opay";

export type ChargeResponse = {
  status: "paid" | "in_progress";
  currency: string;
  tender: string;
  provider: string;
  amountMinor: number;
  splitParts: number;
  reference: string;
  checkoutUrl?: string;
  hostedUrl?: string;
  mode?: "test" | "live";
};

export type VerifyResponse = {
  status: "paid" | "pending" | "failed";
  provider: string;
  reference: string;
  providerReference: string | null;
  amountMinor: number | null;
  providerAmountMinor: number | null;
  amountMatches: boolean | null;
  source: "provider" | "webhook";
  at: string;
  message?: string;
};

export type PaymentEvent = {
  id: string;
  provider: string;
  reference: string;
  event: string;
  status: string;
  providerReference: string | null;
  amountMinor: number | null;
  receivedAt: string;
  mode: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "Payment request failed");
  }
  return data;
}

/**
 * Starts a payment attempt. `cash`, `split`, and `gift-card` are manual tenders
 * that the backend confirms immediately; card/transfer/wallet return a hosted
 * hand-off from the selected HQ-enabled provider.
 */
export async function requestCharge(input: {
  tender: string;
  amountMinor: number;
  parts?: number;
  reference?: string;
  provider?: PaymentProvider;
}): Promise<ChargeResponse> {
  const response = await fetch(apiUrl("/api/payments/charge"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<ChargeResponse>(response);
}

/** Explicit cashier-triggered status check. Never auto-completes a sale. */
export async function verifyPayment(input: {
  provider: PaymentProvider;
  reference: string;
  amountMinor: number;
}): Promise<VerifyResponse> {
  const response = await fetch(apiUrl("/api/payments/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<VerifyResponse>(response);
}

/** Debugging aid; completion still requires verifyPayment() or a paid webhook. */
export async function listPaymentEvents(filter: { provider?: string; reference?: string } = {}) {
  const query = new URLSearchParams();
  if (filter.provider) query.set("provider", filter.provider);
  if (filter.reference) query.set("reference", filter.reference);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(apiUrl(`/api/payments/events${suffix}`));
  return readJson<PaymentEvent[]>(response);
}
