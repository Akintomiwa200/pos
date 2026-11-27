import { BadGatewayException, ServiceUnavailableException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import type { GatewayMode, HqGateway } from "../console/setup.types";
import type { PaymentProvider, PaymentStatus } from "./payments.types";

export type ProviderConfig = {
  provider: PaymentProvider;
  mode: GatewayMode;
  secretKey: string;
  webhookSecret: string;
  publicKey: string;
  merchantId: string;
  apiBase: string;
  statusApiBase: string;
};

export type InitResult = {
  checkoutUrl: string;
  providerReference: string | null;
};

export type ProviderVerifyResult = {
  status: PaymentStatus;
  providerReference: string | null;
  amountMinor: number | null;
  message?: string;
};

export type InitInput = {
  reference: string;
  amountMinor: number;
  callbackUrl: string;
  returnUrl: string;
  cancelUrl: string;
};

const DEFAULTS: Record<PaymentProvider, { test: string; live: string }> = {
  paystack: { test: "https://api.paystack.co", live: "https://api.paystack.co" },
  flutterwave: { test: "https://api.flutterwave.com", live: "https://api.flutterwave.com" },
  moniepoint: { test: "https://api.monnify.com", live: "https://api.monnify.com" },
  // OPay uses different hosts for cashier creation in sandbox/live.
  opay: {
    test: "https://sandboxapi.opaycheckout.com",
    live: "https://api.opaycheckout.com",
  },
};

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function modeOf(gateway: HqGateway | undefined, name: string): GatewayMode {
  return gateway?.mode === "live" || (!gateway && env(`${name}_MODE`) === "live") ? "live" : "test";
}

function payerEmail() {
  return env("PAYMENT_PAYER_EMAIL") || "cashier@pos.local";
}

function callbackBase() {
  return env("PAYMENT_PUBLIC_BASE_URL").replace(/\/$/, "");
}

function webhookUrl(provider: PaymentProvider) {
  return callbackBase() ? `${callbackBase()}/api/payments/webhooks/${provider}` : "";
}

function returnUrl(provider: PaymentProvider) {
  return callbackBase() ? `${callbackBase()}/api/payments/return/${provider}` : "";
}

function sortedJson(value: Record<string, unknown>) {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) sorted[key] = value[key];
  return JSON.stringify(sorted);
}

function requireCredential(value: string, provider: string, envNames: string[]) {
  if (value) return value;
  throw new ServiceUnavailableException(
    `${provider} is not configured on this server. Set ${envNames.join(" or ")} (or the matching HQ gateway field) and restart.`,
  );
}

function messageFrom(data: Record<string, unknown>, fallback: string) {
  const message = data.message ?? data.msg ?? data.error ?? data.description;
  return typeof message === "string" && message.trim() ? message.slice(0, 300) : fallback;
}

async function requestJson<T extends Record<string, unknown>>(
  url: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network error";
    throw new BadGatewayException(`${label} could not be reached: ${reason}`);
  }
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new BadGatewayException(`${label} returned ${response.status}: ${messageFrom(data, text.slice(0, 200))}`);
  }
  return data as T;
}

export function resolveProviderConfig(provider: PaymentProvider, gateway?: HqGateway): ProviderConfig {
  const mode = modeOf(gateway, provider.toUpperCase());
  const envPrefix = provider === "moniepoint" ? "MONNIFY" : provider.toUpperCase();
  const apiBase = gateway?.apiBase || env(`${envPrefix}_API_BASE`) || DEFAULTS[provider][mode];
  const secretKey =
    gateway?.secretKey || env(`${envPrefix}_SECRET_KEY`) || env(`${envPrefix}_PRIVATE_KEY`);
  let publicKey = gateway?.publicKey || env(`${envPrefix}_PUBLIC_KEY`);
  let merchantId = gateway?.merchantId || env(`${envPrefix}_MERCHANT_ID`);
  if (provider === "moniepoint") {
    publicKey = publicKey || env("MONNIFY_API_KEY");
    merchantId = merchantId || env("MONNIFY_CONTRACT_CODE");
  }
  if (provider === "opay") {
    publicKey = publicKey || env("OPAY_PUBLIC_KEY");
    merchantId = merchantId || env("OPAY_MERCHANT_ID");
  }
  const webhookSecret =
    gateway?.webhookSecret ||
    env(`${envPrefix}_WEBHOOK_SECRET`) ||
    env(`${envPrefix}_SECRET_HASH`) ||
    (provider === "paystack" ? secretKey : "");

  const statusApiBase =
    provider === "opay"
      ? env("OPAY_STATUS_API_BASE") ||
        (mode === "live" ? "https://liveapi.opaycheckout.com" : "https://testapi.opaycheckout.com")
      : apiBase;

  return { provider, mode, secretKey, webhookSecret, publicKey, merchantId, apiBase, statusApiBase };
}

function bearer(secret: string) {
  return { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
}

async function initializePaystack(config: ProviderConfig, input: InitInput): Promise<InitResult> {
  const secret = requireCredential(config.secretKey, "Paystack", ["PAYSTACK_SECRET_KEY"]);
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/transaction/initialize`,
    {
      method: "POST",
      headers: bearer(secret),
      body: JSON.stringify({
        email: env("PAYSTACK_PAYER_EMAIL") || payerEmail(),
        amount: input.amountMinor,
        currency: "NGN",
        reference: input.reference,
        ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
      }),
    },
    "Paystack",
  );
  if (json.status === false) throw new BadGatewayException(messageFrom(json, "Paystack rejected the payment"));
  const data = (json.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
  const checkoutUrl = String(data.authorization_url ?? data.authorizationUrl ?? data.checkout_url ?? "");
  if (!checkoutUrl) throw new BadGatewayException("Paystack did not return a checkout URL");
  return {
    checkoutUrl,
    providerReference: data.id ? String(data.id) : data.reference ? String(data.reference) : null,
  };
}

async function verifyPaystack(config: ProviderConfig, reference: string): Promise<ProviderVerifyResult> {
  const secret = requireCredential(config.secretKey, "Paystack", ["PAYSTACK_SECRET_KEY"]);
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET", headers: bearer(secret) },
    "Paystack",
  );
  const data = (json.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
  const rawStatus = String(data.status ?? "").toLowerCase();
  const status: PaymentStatus =
    rawStatus === "success"
      ? "paid"
      : ["pending", "processing", "queued"].includes(rawStatus)
        ? "pending"
        : "failed";
  return {
    status,
    providerReference: data.id ? String(data.id) : data.reference ? String(data.reference) : null,
    amountMinor: data.amount === undefined ? null : Math.round(Number(data.amount)),
    message: status === "failed" ? messageFrom(json, `Paystack status: ${rawStatus || "unknown"}`) : undefined,
  };
}

async function initializeFlutterwave(config: ProviderConfig, input: InitInput): Promise<InitResult> {
  const secret = requireCredential(config.secretKey, "Flutterwave", ["FLUTTERWAVE_SECRET_KEY"]);
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/v3/charges?type=card`,
    {
      method: "POST",
      headers: bearer(secret),
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amountMinor / 100,
        currency: "NGN",
        email: env("FLUTTERWAVE_PAYER_EMAIL") || payerEmail(),
        payment_options: "card",
        ...(input.callbackUrl ? { redirect_url: input.callbackUrl } : {}),
        meta: { reference: input.reference },
      }),
    },
    "Flutterwave",
  );
  if (json.status !== "success") throw new BadGatewayException(messageFrom(json, "Flutterwave rejected the charge"));
  const data = (json.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
  const checkoutUrl = String(data.link ?? data.hostedUrl ?? data.redirect_url ?? "");
  if (!checkoutUrl) throw new BadGatewayException("Flutterwave did not return a hosted checkout URL");
  return {
    checkoutUrl,
    providerReference: data.id ? String(data.id) : null,
  };
}

async function verifyFlutterwave(
  config: ProviderConfig,
  providerReference: string | null,
): Promise<ProviderVerifyResult> {
  const secret = requireCredential(config.secretKey, "Flutterwave", ["FLUTTERWAVE_SECRET_KEY"]);
  if (!providerReference) {
    throw new BadGatewayException("Flutterwave transaction id is missing; the charge cannot be verified");
  }
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/v3/transactions/${encodeURIComponent(providerReference)}/verify`,
    { method: "GET", headers: bearer(secret) },
    "Flutterwave",
  );
  const data = (json.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
  const rawStatus = String(data.status ?? "").toLowerCase();
  const status: PaymentStatus =
    rawStatus === "successful" || rawStatus === "success"
      ? "paid"
      : ["pending", "processing"].includes(rawStatus)
        ? "pending"
        : "failed";
  return {
    status,
    providerReference: data.id ? String(data.id) : providerReference,
    amountMinor: data.amount === undefined ? null : Math.round(Number(data.amount) * 100),
    message: status === "failed" ? messageFrom(json, `Flutterwave status: ${rawStatus || "unknown"}`) : undefined,
  };
}

function monnifyAuth(config: ProviderConfig) {
  const apiKey = requireCredential(config.publicKey, "Moniepoint (Monnify)", ["MONNIFY_API_KEY"]);
  const secret = requireCredential(config.secretKey, "Moniepoint (Monnify)", ["MONNIFY_SECRET_KEY"]);
  const token = Buffer.from(`${apiKey}:${secret}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

async function initializeMoniepoint(config: ProviderConfig, input: InitInput): Promise<InitResult> {
  const headers = monnifyAuth(config);
  const contractCode = requireCredential(config.merchantId, "Moniepoint (Monnify)", ["MONNIFY_CONTRACT_CODE"]);
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/api/v1/merchant/transactions/init-transaction`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        contractCode,
        reference: input.reference,
        amount: input.amountMinor / 100,
        currency: "NGN",
        ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
        ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
        customer: { email: env("MONNIFY_PAYER_EMAIL") || payerEmail(), name: "POS Customer" },
      }),
    },
    "Moniepoint (Monnify)",
  );
  if (json.requestSuccessful === false) {
    throw new BadGatewayException(messageFrom(json, "Monnify rejected the transaction"));
  }
  const body = (json.responseBody && typeof json.responseBody === "object" ? json.responseBody : {}) as Record<string, unknown>;
  const checkoutUrl = String(body.checkoutUrl ?? json.checkoutUrl ?? "");
  if (!checkoutUrl) throw new BadGatewayException("Monnify did not return a checkout URL");
  return {
    checkoutUrl,
    providerReference: body.transactionReference ? String(body.transactionReference) : input.reference,
  };
}

async function verifyMoniepoint(config: ProviderConfig, reference: string): Promise<ProviderVerifyResult> {
  const headers = monnifyAuth(config);
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/api/v1/merchant/transactions/status?transactionReference=${encodeURIComponent(reference)}`,
    { method: "GET", headers },
    "Moniepoint (Monnify)",
  );
  const body = (json.responseBody && typeof json.responseBody === "object" ? json.responseBody : {}) as Record<string, unknown>;
  const rawStatus = String(body.status ?? "").toUpperCase();
  const status: PaymentStatus =
    ["PAID", "SUCCESSFUL", "SUCCESS", "SETTLED"].includes(rawStatus)
      ? "paid"
      : ["PENDING", "PROCESSING", "INITIALIZED"].includes(rawStatus)
        ? "pending"
        : "failed";
  const amount = body.amountPaid ?? body.amount ?? body.transactionAmount;
  return {
    status,
    providerReference: body.transactionReference ? String(body.transactionReference) : reference,
    amountMinor: amount === undefined || amount === null ? null : Math.round(Number(amount) * 100),
    message: status === "failed" ? messageFrom(json, `Monnify status: ${rawStatus || "unknown"}`) : undefined,
  };
}

async function initializeOpay(config: ProviderConfig, input: InitInput): Promise<InitResult> {
  const publicKey = requireCredential(config.publicKey, "OPay", ["OPAY_PUBLIC_KEY"]);
  const merchantId = requireCredential(config.merchantId, "OPay", ["OPAY_MERCHANT_ID"]);
  const json = await requestJson<Record<string, unknown>>(
    `${config.apiBase.replace(/\/$/, "")}/api/v1/international/cashier/create`,
    {
      method: "POST",
      headers: { ...bearer(publicKey), MerchantId: merchantId },
      body: JSON.stringify({
        country: "NG",
        reference: input.reference,
        amount: { total: input.amountMinor / 100, currency: "NGN" },
        ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
        ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
        ...(input.cancelUrl ? { cancelUrl: input.cancelUrl } : {}),
      }),
    },
    "OPay",
  );
  if (json.code && json.code !== "00000") {
    throw new BadGatewayException(messageFrom(json, "OPay rejected the cashier request"));
  }
  const data = (json.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
  const checkoutUrl = String(data.cashierUrl ?? data.checkoutUrl ?? data.hostedUrl ?? "");
  if (!checkoutUrl) throw new BadGatewayException("OPay did not return a cashier URL");
  return {
    checkoutUrl,
    providerReference: data.orderNo ? String(data.orderNo) : data.reference ? String(data.reference) : null,
  };
}

async function verifyOpay(config: ProviderConfig, reference: string): Promise<ProviderVerifyResult> {
  const privateKey = requireCredential(config.secretKey, "OPay", ["OPAY_PRIVATE_KEY"]);
  const merchantId = requireCredential(config.merchantId, "OPay", ["OPAY_MERCHANT_ID"]);
  const body = sortedJson({ reference, country: "NG" });
  const signature = createHmac("sha512", privateKey).update(body).digest("hex");
  const json = await requestJson<Record<string, unknown>>(
    `${config.statusApiBase.replace(/\/$/, "")}/api/v1/international/cashier/status`,
    {
      method: "POST",
      headers: { ...bearer(signature), MerchantId: merchantId },
      body,
    },
    "OPay",
  );
  if (json.code && json.code !== "00000") {
    throw new BadGatewayException(messageFrom(json, "OPay could not resolve the payment status"));
  }
  const data = (json.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
  const rawStatus = String(data.status ?? "").toUpperCase();
  const status: PaymentStatus =
    ["SUCCESS", "PAID", "SUCCESSFUL"].includes(rawStatus)
      ? "paid"
      : ["INITIAL", "PENDING", "PROCESSING"].includes(rawStatus)
        ? "pending"
        : "failed";
  const amount = data.amount && typeof data.amount === "object" ? (data.amount as Record<string, unknown>).total : undefined;
  const minor = env("OPAY_AMOUNT_IS_MINOR") === "1" ? 1 : 100;
  return {
    status,
    providerReference: data.orderNo ? String(data.orderNo) : data.reference ? String(data.reference) : reference,
    amountMinor: amount === undefined ? null : Math.round(Number(amount) * minor),
    message: status === "failed" ? messageFrom(json, `OPay status: ${rawStatus || "unknown"}`) : undefined,
  };
}

export async function initializeWithProvider(
  provider: PaymentProvider,
  config: ProviderConfig,
  input: InitInput,
) {
  switch (provider) {
    case "paystack":
      return initializePaystack(config, input);
    case "flutterwave":
      return initializeFlutterwave(config, input);
    case "moniepoint":
      return initializeMoniepoint(config, input);
    case "opay":
      return initializeOpay(config, input);
  }
}

export async function verifyWithProvider(
  provider: PaymentProvider,
  config: ProviderConfig,
  reference: string,
  providerReference: string | null,
) {
  switch (provider) {
    case "paystack":
      return verifyPaystack(config, reference);
    case "flutterwave":
      return verifyFlutterwave(config, providerReference);
    case "moniepoint":
      return verifyMoniepoint(config, reference);
    case "opay":
      return verifyOpay(config, reference);
  }
}

/** URLs used for hosted checkout hand-off; require a configured public base. */
export function checkoutUrls(provider: PaymentProvider) {
  return {
    callbackUrl: webhookUrl(provider),
    returnUrl: returnUrl(provider),
    cancelUrl: returnUrl(provider),
  };
}
