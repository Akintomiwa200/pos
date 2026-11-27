/** Provider rails that can be handed off to a hosted checkout. */
export type PaymentProvider = "paystack" | "flutterwave" | "moniepoint" | "opay";

export type PaymentStatus = "paid" | "pending" | "failed";

export type ChargeInput = {
  tender: string;
  amountMinor: number;
  parts?: number;
  reference?: string;
  provider?: string;
};

export type ChargeResult = {
  status: "paid" | "in_progress";
  currency: string;
  tender: string;
  provider: string;
  gatewayId?: string;
  amountMinor: number;
  splitParts: number;
  reference: string;
  checkoutUrl?: string;
  hostedUrl?: string;
  mode?: "test" | "live";
};

export type VerifyInput = {
  provider: string;
  reference: string;
  amountMinor?: number;
};

export type VerifyResult = {
  status: PaymentStatus;
  provider: string;
  reference: string;
  providerReference: string | null;
  amountMinor: number | null;
  providerAmountMinor: number | null;
  amountMatches: boolean | null;
  /** Distinguishes a direct provider lookup from a verified webhook record. */
  source: "provider" | "webhook";
  at: string;
  message?: string;
};

export type PaymentEvent = {
  /** Deterministic id: provider + reference + event. */
  id: string;
  provider: string;
  reference: string;
  event: string;
  status: PaymentStatus | "initialized" | "unknown";
  providerReference: string | null;
  amountMinor: number | null;
  receivedAt: string;
  mode: "test" | "live" | "unknown";
  raw?: unknown;
};

export type RecordPaymentEventInput = Omit<PaymentEvent, "id" | "receivedAt"> & {
  receivedAt?: string;
};
