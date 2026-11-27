import { apiUrl } from "./api-base";

export type ChargeResponse = {
  status: "paid" | "in_progress";
  currency: string;
  tender: string;
  provider: string;
  amountMinor: number;
  splitParts: number;
  reference: string;
};

/**
 * Starts a payment attempt. `cash`, `split`, and `gift-card` are manual tenders
 * that the backend confirms immediately; card/transfer/wallet return a
 * hand-off for the cashier to confirm.
 */
export async function requestCharge(input: {
  tender: string;
  amountMinor: number;
  parts?: number;
  reference?: string;
}): Promise<ChargeResponse> {
  const response = await fetch(apiUrl("/api/payments/charge"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as ChargeResponse & {
    message?: string | string[];
  };
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "Payment could not be started");
  }
  return data;
}
