import { Injectable, OnModuleInit } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Subject } from "rxjs";
import type { PaymentEvent, RecordPaymentEventInput } from "./payments.types";

/**
 * Small append-only ledger used for webhook idempotency and for POS lookups
 * when the provider's pull API is temporarily unavailable.
 */
@Injectable()
export class PaymentEventsService implements OnModuleInit {
  private events: PaymentEvent[] = [];
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly file =
    process.env.PAYMENT_EVENTS_FILE?.trim() || join(process.cwd(), "data", "payment-events.json");
  private readonly changes = new Subject<PaymentEvent>();

  async onModuleInit() {
    try {
      const parsed = JSON.parse(await readFile(this.file, "utf8")) as unknown;
      if (Array.isArray(parsed)) {
        this.events = parsed.filter((row): row is PaymentEvent => Boolean(row && typeof row === "object"));
      }
    } catch {
      this.events = [];
    }
  }

  eventStream() {
    return this.changes.asObservable();
  }

  list(filter: { provider?: string; reference?: string } = {}) {
    return this.events
      .filter((row) => (filter.provider ? row.provider === filter.provider : true))
      .filter((row) => (filter.reference ? row.reference === filter.reference : true))
      .slice()
      .reverse();
  }

  hasPaidEvent(provider: string, reference: string) {
    return this.events.some(
      (row) => row.provider === provider && row.reference === reference && row.status === "paid",
    );
  }

  paidEvent(provider: string, reference: string) {
    return this.events.find(
      (row) => row.provider === provider && row.reference === reference && row.status === "paid",
    );
  }

  initializedEvent(provider: string, reference: string) {
    return this.events.find(
      (row) =>
        row.provider === provider && row.reference === reference && row.event === "initialized",
    );
  }

  /**
   * Idempotent by provider + reference + event. A duplicate delivery returns
   * the stored record without rewriting the file.
   */
  async record(input: RecordPaymentEventInput): Promise<{ event: PaymentEvent; duplicate: boolean }> {
    const id = createHash("sha256")
      .update(`${input.provider}|${input.reference}|${input.event}`)
      .digest("hex");
    const existing = this.events.find((row) => row.id === id);
    if (existing) return { event: existing, duplicate: true };

    const event: PaymentEvent = {
      ...input,
      id,
      receivedAt: input.receivedAt ?? new Date().toISOString(),
    };
    this.events = [...this.events.slice(-999), event];
    this.changes.next(event);
    await this.flush();
    return { event, duplicate: false };
  }

  private flush() {
    // A failed write must not poison every later webhook record.
    this.writeQueue = this.writeQueue.catch(() => undefined).then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      const temp = `${this.file}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(this.events, null, 2), "utf8");
      await rename(temp, this.file);
    });
    return this.writeQueue;
  }
}
