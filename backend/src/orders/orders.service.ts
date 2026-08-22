import { Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  docTotal,
  isDocKind,
  nextNumber,
  type DocLine,
  type DocStatus,
  type TradeDoc,
} from "./orders.types";

const STATUSES: DocStatus[] = ["draft", "open", "received", "closed", "cancelled"];

@Injectable()
export class OrdersService {
  private docs: TradeDoc[] = [];
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "trade-docs.json");

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as TradeDoc[];
      if (Array.isArray(parsed)) this.docs = parsed;
    } catch {
      this.docs = [];
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.docs, null, 2), "utf8");
  }

  list(kind?: string): TradeDoc[] {
    if (!kind) return this.docs;
    return this.docs.filter((doc) => doc.kind === kind);
  }

  get(id: string): TradeDoc {
    const doc = this.docs.find((row) => row.id === id);
    if (!doc) throw new NotFoundException("Document not found");
    return doc;
  }

  async save(input: Partial<TradeDoc>): Promise<TradeDoc> {
    const kind =
      input.kind && isDocKind(input.kind) ? input.kind : undefined;
    if (!kind) throw new NotFoundException("A valid document kind is required");
    const existing = input.id ? this.docs.find((row) => row.id === input.id) : undefined;

    const lines: DocLine[] = (input.lines ?? existing?.lines ?? [])
      .filter((line) => line.name?.trim())
      .map((line) => ({
        itemId: line.itemId?.trim() || "",
        name: line.name.trim(),
        quantity: Math.max(1, Math.round(line.quantity || 1)),
        unitPriceMinor: Math.max(0, Math.round(line.unitPriceMinor || 0)),
      }));
    if (!lines.length) throw new NotFoundException("At least one line item is required");

    const status = STATUSES.includes(input.status as DocStatus)
      ? (input.status as DocStatus)
      : existing?.status ?? "open";

    const next: TradeDoc = {
      id: existing?.id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      number: existing?.number ?? input.number?.trim() ?? nextNumber(kind, this.docs),
      party: input.party?.trim() ?? existing?.party ?? "",
      at: existing?.at ?? new Date().toISOString(),
      expectedAt: input.expectedAt ?? existing?.expectedAt,
      status,
      lines,
      totalMinor: docTotal(lines),
      notes: input.notes?.trim() ?? existing?.notes,
    };
    this.docs = existing
      ? this.docs.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.docs];
    await this.persist();
    return next;
  }

  async delete(id: string) {
    const before = this.docs.length;
    this.docs = this.docs.filter((row) => row.id !== id);
    if (this.docs.length === before) throw new NotFoundException("Document not found");
    await this.persist();
  }
}
