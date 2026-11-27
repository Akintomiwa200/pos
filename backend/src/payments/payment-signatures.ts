import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayMode } from "../console/setup.types";

export type WebhookHeaders = Record<string, string | string[] | undefined>;

function header(headers: WebhookHeaders, name: string) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function hmac(algorithm: string, key: string, content: string | Buffer, encoding: "hex" | "base64") {
  return createHmac(algorithm, key).update(content).digest(encoding);
}

/** Constant-time comparison that never throws on malformed or short input. */
function equal(expected: string, actual: string | undefined, encoding: "hex" | "base64") {
  if (!actual) return false;
  try {
    const left = Buffer.from(expected, encoding);
    const right = Buffer.from(actual.trim(), encoding);
    return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function equalText(expected: string, actual: string | undefined) {
  if (!actual) return false;
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(actual.trim(), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyPaystack(raw: Buffer, headers: WebhookHeaders, secret: string) {
  if (!secret) return false;
  const signature = header(headers, "paystack-signature") ?? header(headers, "x-paystack-signature");
  return equal(hmac("sha512", secret, raw, "hex"), signature, "hex");
}

export function verifyFlutterwave(raw: Buffer, headers: WebhookHeaders, secretHash: string) {
  if (!secretHash) return false;
  const legacy = header(headers, "verif-hash");
  if (legacy && equalText(secretHash, legacy)) return true;
  const signature = header(headers, "flutterwave-signature");
  return equal(hmac("sha256", secretHash, raw, "base64"), signature, "base64");
}

/**
 * Monnify computes HMAC-SHA512(clientSecret + rawBody). Sandbox notifications
 * may omit the header; production/live notifications must carry it.
 */
export function verifyMonnify(
  raw: Buffer,
  headers: WebhookHeaders,
  secret: string,
  mode: GatewayMode,
) {
  if (!secret) return false;
  const signature = header(headers, "monnify-signature");
  if (!signature) return mode === "test";
  return equal(hmac("sha512", secret, Buffer.concat([Buffer.from(secret, "utf8"), raw]), "hex"), signature, "hex");
}

export type OpayScheme = "auto" | "sha3-callback" | "sha512-timestamp" | "sha512-body";

function opaySignContent(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const payload = (root.payload ?? root.data) as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== "object") return null;
  const text = (value: unknown) => (value === undefined || value === null ? "" : String(value));
  // Format documented by OPay for cashier callback notifications.
  return (
    `{Amount:"${text(payload.amount)}",` +
    `Currency:"${text(payload.currency)}",` +
    `Reference:"${text(payload.reference ?? payload.outOrderNo)}",` +
    `Refunded:${payload.refunded === true || payload.refunded === "true" || payload.refunded === "t" ? "t" : "f"},` +
    `Status:"${text(payload.status)}",` +
    `Timestamp:"${text(payload.timestamp)}",` +
    `Token:"${text(payload.token)}",` +
    `TransactionID:"${text(payload.transactionId ?? payload.orderNo)}"}`
  );
}

/**
 * OPay publishes two different notification shapes. The cashier callback uses
 * HMAC-SHA3-512 over a fixed payload string (`sha512` field). Some OPay
 * integrations send a `sign` header over timestamp + param content; that
 * variant is opt-in via OPAY_WEBHOOK_SCHEME because the exact message template
 * is account/configuration specific. Nothing is accepted without a match.
 */
export function verifyOpay(
  raw: Buffer,
  body: unknown,
  headers: WebhookHeaders,
  privateKey: string,
  mode: GatewayMode,
  scheme: OpayScheme,
) {
  if (!privateKey) return false;
  const root = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const payload = (root.payload ?? root.data ?? root) as Record<string, unknown>;
  const callbackSignature =
    (typeof root.sha512 === "string" && root.sha512) ||
    (typeof payload.sha512 === "string" && payload.sha512) ||
    header(headers, "sha512");
  const content = opaySignContent(body);
  if (callbackSignature && content) {
    if (equal(hmac("sha3-512", privateKey, content, "hex"), callbackSignature, "hex")) return true;
  }

  const signature =
    header(headers, "sign") ??
    header(headers, "signature") ??
    header(headers, "x-opay-sign") ??
    header(headers, "x-opay-signature") ??
    (typeof root.sign === "string" ? root.sign : undefined);
  if (!signature) return false;
  if (scheme === "sha3-callback") return false;

  const timestamp =
    header(headers, "x-opay-timestamp") ??
    header(headers, "timestamp") ??
    (typeof payload.timestamp === "string" ? payload.timestamp : undefined) ??
    "";
  const configured = process.env.OPAY_WEBHOOK_PARAM_CONTENT?.trim();
  const paramContent = configured
    ? configured.replaceAll("{timestamp}", timestamp).replaceAll("{body}", raw.toString("utf8"))
    : raw.toString("utf8");
  const signedContent = `${timestamp}${paramContent}`;
  if (scheme === "sha512-body") {
    return equal(hmac("sha512", privateKey, paramContent, "hex"), signature, "hex");
  }
  // Generic timestamp + body form. In live mode require explicit opt-in so a
  // misconfigured merchant cannot silently accept an unverifiable signature.
  if (mode === "live" && scheme === "auto") return false;
  return equal(hmac("sha512", privateKey, signedContent, "hex"), signature, "hex");
}

export function parseOpayScheme(value: string | undefined): OpayScheme {
  return value === "sha3-callback" || value === "sha512-timestamp" || value === "sha512-body"
    ? value
    : "auto";
}
