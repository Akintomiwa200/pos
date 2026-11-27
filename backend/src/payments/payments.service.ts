import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { SetupService } from "../console/setup.service";
import {
  checkoutUrls,
  initializeWithProvider,
  resolveProviderConfig,
  verifyWithProvider,
} from "./payment-adapters";
import { PaymentEventsService } from "./payment-events.service";
import {
  parseOpayScheme,
  verifyFlutterwave,
  verifyMonnify,
  verifyOpay,
  verifyPaystack,
  type WebhookHeaders,
} from "./payment-signatures";
import type {
  ChargeInput,
  ChargeResult,
  PaymentEvent,
  PaymentProvider,
  PaymentStatus,
  VerifyInput,
  VerifyResult,
} from "./payments.types";

const ELECTRONIC: PaymentProvider[] = ["paystack", "flutterwave", "moniepoint", "opay"];
const MANUAL = new Set(["cash", "split", "gift-card", "bank", "card", "transfer", "wallet"]);

function isProvider(value: string): value is PaymentProvider {
  return ELECTRONIC.includes(value as PaymentProvider);
}

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function majorToMinor(value: unknown) {
  const major = numberOrNull(value);
  return major === null ? null : Math.round(major * 100);
}

type ExtractedEvent = {
  reference: string;
  event: string;
  status: PaymentStatus | "unknown";
  providerReference: string | null;
  amountMinor: number | null;
};

function extractWebhookEvent(provider: PaymentProvider, body: unknown): ExtractedEvent {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const unknown: ExtractedEvent = {
    reference: "",
    event: "unknown",
    status: "unknown",
    providerReference: null,
    amountMinor: null,
  };

  if (provider === "paystack") {
    const event = text(root.event || "event");
    const statusText = `${event} ${text(data.status)}`.toLowerCase();
    return {
      ...unknown,
      reference: text(data.reference),
      event,
      status: /success|paid/.test(statusText)
        ? "paid"
        : /fail|revers|abandon|cancel/.test(statusText)
          ? "failed"
          : "pending",
      providerReference: text(data.id) || text(data.reference) || null,
      amountMinor: numberOrNull(data.amount),
    };
  }

  if (provider === "flutterwave") {
    const event = text(root.event || "event");
    const statusText = text(data.status).toLowerCase();
    return {
      ...unknown,
      reference: text(data.txRef || data.reference),
      event,
      status:
        statusText === "successful" || statusText === "success"
          ? "paid"
          : ["pending", "processing"].includes(statusText)
            ? "pending"
            : "failed",
      providerReference: text(data.id) || null,
      amountMinor: majorToMinor(data.amount),
    };
  }

  if (provider === "moniepoint") {
    const event = text(root.eventType || root.event || "event");
    const statusText = `${event} ${text(data.status)}`.toUpperCase();
    return {
      ...unknown,
      reference: text(data.transactionReference || data.paymentReference || data.reference),
      event,
      status:
        /SUCCESS|PAID|COMPLETED/.test(statusText)
          ? "paid"
          : /FAIL|REJECT|CANCEL|REVERS/.test(statusText)
            ? "failed"
            : "pending",
      providerReference: text(data.transactionReference) || null,
      amountMinor: majorToMinor(data.amountPaid ?? data.amount),
    };
  }

  const payload = (root.payload && typeof root.payload === "object" ? root.payload : data) as Record<string, unknown>;
  const statusText = text(payload.status).toUpperCase();
  const minor = process.env.OPAY_AMOUNT_IS_MINOR === "1" ? 1 : 100;
  return {
    ...unknown,
    reference: text(payload.reference || payload.outOrderNo),
    event: text(root.type || "transaction-status"),
    status:
      ["SUCCESS", "PAID", "SUCCESSFUL"].includes(statusText)
        ? "paid"
        : ["INITIAL", "PENDING", "PROCESSING"].includes(statusText)
          ? "pending"
          : "failed",
    providerReference: text(payload.transactionId || payload.orderNo) || null,
    amountMinor: numberOrNull(payload.amount) === null ? null : Math.round(Number(payload.amount) * minor),
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly setup: SetupService,
    private readonly events: PaymentEventsService,
  ) {}

  private config(provider: PaymentProvider) {
    const gateway = this.setup.getGatewayCredentials(provider, false);
    return resolveProviderConfig(provider, gateway ?? undefined);
  }

  private providerReference(provider: string) {
    const prefix = provider.slice(0, 3).toUpperCase();
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  /**
   * Manual tenders are confirmed locally. Electronic tenders start a real
   * provider checkout and can never be reported as paid here.
   */
  async charge(input: ChargeInput): Promise<ChargeResult> {
    const amountMinor = Math.round(Number(input.amountMinor ?? 0));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException("A positive amountMinor is required");
    }
    const parts = Math.max(1, Math.min(12, Math.round(Number(input.parts ?? 1) || 1)));
    const tender = text(input.tender).trim().toLowerCase() || "cash";
    const reference = text(input.reference).trim() || this.providerReference(tender);

    if (MANUAL.has(tender)) {
      return {
        status: "paid",
        currency: "NGN",
        tender,
        provider: "manual",
        amountMinor,
        splitParts: parts,
        reference,
      };
    }

    const requested = text(input.provider).trim().toLowerCase();
    let provider: PaymentProvider;
    if (requested) {
      if (!isProvider(requested)) {
        throw new BadRequestException(`Unsupported payment provider: ${requested}`);
      }
      provider = requested;
    } else {
      const enabled = this.setup
        .listGatewayCredentials()
        .filter((row) => row.enabled && isProvider(row.provider));
      const chosen =
        enabled.find((row) => row.isDefault) ?? enabled[0];
      if (!chosen || !isProvider(chosen.provider)) {
        throw new ServiceUnavailableException("No enabled electronic payment gateway is configured at HQ");
      }
      provider = chosen.provider;
    }

    const gateway = this.setup.getGatewayCredentials(provider);
    if (!gateway?.enabled) {
      throw new ServiceUnavailableException(`${provider} is not enabled at HQ`);
    }

    const config = this.config(provider);
    const urls = checkoutUrls(provider);
    const initialized = await initializeWithProvider(provider, config, {
      reference,
      amountMinor,
      ...urls,
    });
    await this.events.record({
      provider,
      reference,
      event: "initialized",
      status: "initialized",
      providerReference: initialized.providerReference,
      amountMinor,
      mode: config.mode,
    });

    return {
      status: "in_progress",
      currency: "NGN",
      tender,
      provider,
      gatewayId: gateway.id,
      amountMinor,
      splitParts: parts,
      reference,
      checkoutUrl: initialized.checkoutUrl,
      hostedUrl: initialized.checkoutUrl,
      mode: config.mode,
    };
  }

  /** Pull verification. A paid result always comes from the provider or a
   * signature-verified webhook record — never from the POS timer. */
  async verify(input: VerifyInput): Promise<VerifyResult> {
    const provider = text(input.provider).trim().toLowerCase();
    const reference = text(input.reference).trim();
    if (!isProvider(provider)) throw new BadRequestException("A supported provider is required");
    if (!reference) throw new BadRequestException("A payment reference is required");

    const initialized = this.events.initializedEvent(provider, reference);
    const expectedMinor =
      input.amountMinor === undefined
        ? (initialized?.amountMinor ?? null)
        : Math.round(Number(input.amountMinor));
    const providerReference = initialized?.providerReference ?? null;
    const paidEvent = this.events.paidEvent(provider, reference);
    const config = this.config(provider);

    let providerResult: Awaited<ReturnType<typeof verifyWithProvider>> | null = null;
    let providerError = "";
    try {
      providerResult = await verifyWithProvider(provider, config, reference, providerReference);
    } catch (error) {
      if (!paidEvent) throw error;
      providerError = error instanceof Error ? error.message : "Provider lookup unavailable";
    }

    let status: PaymentStatus = providerResult?.status ?? (paidEvent ? "paid" : "pending");
    let source: "provider" | "webhook" = "provider";
    if (paidEvent && status !== "paid") {
      status = "paid";
      source = "webhook";
    } else if (!providerResult && paidEvent) {
      source = "webhook";
    }

    const providerAmountMinor =
      providerResult?.amountMinor ?? paidEvent?.amountMinor ?? initialized?.amountMinor ?? null;
    const amountMatches =
      expectedMinor === null || providerAmountMinor === null ? null : expectedMinor === providerAmountMinor;
    const message = status === "paid" && amountMatches === false
      ? "Provider amount does not match the requested payment amount"
      : status === "failed"
        ? providerResult?.message ?? providerError ?? "Payment was not completed"
        : undefined;
    if (status === "paid" && amountMatches === false) status = "failed";

    return {
      status,
      provider,
      reference,
      providerReference: providerResult?.providerReference ?? paidEvent?.providerReference ?? providerReference,
      amountMinor: expectedMinor,
      providerAmountMinor,
      amountMatches,
      source,
      at: new Date().toISOString(),
      ...(message ? { message } : {}),
    };
  }

  async handleWebhook(
    provider: string,
    headers: WebhookHeaders,
    raw: Buffer | undefined,
    body: unknown,
  ) {
    const normalized = provider === "monnify" ? "moniepoint" : provider;
    if (!isProvider(normalized)) {
      throw new BadRequestException(`No webhook handler for provider: ${provider}`);
    }
    const config = this.config(normalized);
    const rawBody = raw ?? Buffer.from(JSON.stringify(body ?? {}), "utf8");
    let verified = false;
    switch (normalized) {
      case "paystack":
        verified = verifyPaystack(rawBody, headers, config.webhookSecret || config.secretKey);
        break;
      case "flutterwave":
        verified = verifyFlutterwave(rawBody, headers, config.webhookSecret || config.secretKey);
        break;
      case "moniepoint":
        verified = verifyMonnify(rawBody, headers, config.secretKey, config.mode);
        break;
      case "opay":
        verified = verifyOpay(
          rawBody,
          body,
          headers,
          config.secretKey,
          config.mode,
          parseOpayScheme(process.env.OPAY_WEBHOOK_SCHEME),
        );
        break;
    }
    if (!verified) {
      throw new UnauthorizedException(
        `${normalized} webhook signature could not be verified; no event was recorded`,
      );
    }

    const info = extractWebhookEvent(normalized, body);
    if (!info.reference) throw new BadRequestException("Webhook did not contain a payment reference");
    const recorded = await this.events.record({
      provider: normalized,
      reference: info.reference,
      event: info.event,
      status: info.status,
      providerReference: info.providerReference,
      amountMinor: info.amountMinor,
      mode: config.mode,
      raw: body,
    });
    return {
      received: true,
      duplicate: recorded.duplicate,
      provider: normalized,
      reference: info.reference,
      event: info.event,
      status: info.status,
    };
  }

  listEvents(filter: { provider?: string; reference?: string } = {}): PaymentEvent[] {
    return this.events.list(filter);
  }

  eventStream() {
    return this.events.eventStream();
  }
}
