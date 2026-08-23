import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ORDER_STATUSES,
  SEED_PURCHASE_ORDERS,
  docTotal,
  isDocKind,
  nextNumber,
  type DocLine,
  type DocStatus,
  type TradeDoc,
} from "./orders.types";

@Injectable()
export class OrdersService implements OnModuleInit {
  private docs: TradeDoc[] = [];
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "trade-docs.json");

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as TradeDoc[];
      if (Array.isArray(parsed) && parsed.length) {
        this.docs = parsed;
        return;
      }
    } catch {
      /* empty */
    }
    this.docs = structuredClone(SEED_PURCHASE_ORDERS);
    await this.persist();
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

  summary(kind = "purchase-order") {
    const rows = this.list(kind);
    const byStatus: Record<string, { count: number; totalMinor: number }> = {};
    for (const row of rows) {
      const bucket = byStatus[row.status] ?? { count: 0, totalMinor: 0 };
      bucket.count += 1;
      bucket.totalMinor += row.totalMinor;
      byStatus[row.status] = bucket;
    }
    const vendors = new Map<string, { count: number; totalMinor: number }>();
    for (const row of rows) {
      const key = row.party || "Unknown";
      const bucket = vendors.get(key) ?? { count: 0, totalMinor: 0 };
      bucket.count += 1;
      bucket.totalMinor += row.totalMinor;
      vendors.set(key, bucket);
    }
    return {
      count: rows.length,
      totalMinor: rows.reduce((sum, row) => sum + row.totalMinor, 0),
      pendingApproval: rows.filter((row) => row.status === "pending_approval").length,
      awaitingReceive: rows.filter((row) =>
        ["approved", "open", "partial"].includes(row.status),
      ).length,
      byStatus,
      topVendors: [...vendors.entries()]
        .map(([party, stats]) => ({ party, ...stats }))
        .sort((a, b) => b.totalMinor - a.totalMinor)
        .slice(0, 8),
    };
  }

  async save(input: Partial<TradeDoc>): Promise<TradeDoc> {
    const kind = input.kind && isDocKind(input.kind) ? input.kind : undefined;
    if (!kind) throw new BadRequestException("A valid document kind is required");
    const existing = input.id ? this.docs.find((row) => row.id === input.id) : undefined;

    const lines: DocLine[] = (input.lines ?? existing?.lines ?? [])
      .filter((line) => line.name?.trim())
      .map((line) => ({
        itemId: line.itemId?.trim() || "",
        name: line.name.trim(),
        quantity: Math.max(1, Math.round(line.quantity || 1)),
        unitPriceMinor: Math.max(0, Math.round(line.unitPriceMinor || 0)),
        receivedQty: Math.max(0, Math.round(line.receivedQty || 0)),
      }));
    if (!lines.length) throw new BadRequestException("At least one line item is required");

    const status = ORDER_STATUSES.includes(input.status as DocStatus)
      ? (input.status as DocStatus)
      : existing?.status ?? "draft";

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
      createdBy: input.createdBy?.trim() || existing?.createdBy || "HQ",
      submittedAt: input.submittedAt ?? existing?.submittedAt,
      approvedAt: input.approvedAt ?? existing?.approvedAt,
      approvedBy: input.approvedBy ?? existing?.approvedBy,
      rejectedAt: input.rejectedAt ?? existing?.rejectedAt,
      rejectedBy: input.rejectedBy ?? existing?.rejectedBy,
      rejectionReason: input.rejectionReason ?? existing?.rejectionReason,
      receivedAt: input.receivedAt ?? existing?.receivedAt,
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

  private async mutate(id: string, fn: (doc: TradeDoc) => TradeDoc) {
    const doc = this.get(id);
    const next = fn(doc);
    this.docs = this.docs.map((row) => (row.id === id ? next : row));
    await this.persist();
    return next;
  }

  async submit(id: string) {
    return this.mutate(id, (doc) => {
      if (!["draft", "rejected"].includes(doc.status)) {
        throw new BadRequestException("Only draft or rejected orders can be submitted");
      }
      return {
        ...doc,
        status: "pending_approval",
        submittedAt: new Date().toISOString(),
        rejectionReason: undefined,
        rejectedAt: undefined,
        rejectedBy: undefined,
      };
    });
  }

  async approve(id: string, body?: { approvedBy?: string }) {
    return this.mutate(id, (doc) => {
      if (doc.status !== "pending_approval") {
        throw new BadRequestException("Only pending orders can be approved");
      }
      return {
        ...doc,
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: body?.approvedBy?.trim() || "Approver",
      };
    });
  }

  async reject(id: string, body?: { rejectedBy?: string; reason?: string }) {
    return this.mutate(id, (doc) => {
      if (doc.status !== "pending_approval") {
        throw new BadRequestException("Only pending orders can be rejected");
      }
      return {
        ...doc,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedBy: body?.rejectedBy?.trim() || "Approver",
        rejectionReason: body?.reason?.trim() || "Rejected",
      };
    });
  }

  async send(id: string) {
    return this.mutate(id, (doc) => {
      if (!["approved", "open"].includes(doc.status)) {
        throw new BadRequestException("Approve the order before sending to vendor");
      }
      return { ...doc, status: "open" };
    });
  }

  async receive(
    id: string,
    body?: { lines?: Array<{ index: number; receivedQty: number }>; full?: boolean },
  ) {
    return this.mutate(id, (doc) => {
      if (!["approved", "open", "partial"].includes(doc.status)) {
        throw new BadRequestException("This order is not awaiting goods");
      }
      const lines = doc.lines.map((line, index) => {
        if (body?.full) {
          return { ...line, receivedQty: line.quantity };
        }
        const patch = body?.lines?.find((row) => row.index === index);
        if (!patch) return line;
        return {
          ...line,
          receivedQty: Math.min(line.quantity, Math.max(0, Math.round(patch.receivedQty))),
        };
      });
      const allIn = lines.every((line) => (line.receivedQty ?? 0) >= line.quantity);
      const anyIn = lines.some((line) => (line.receivedQty ?? 0) > 0);
      return {
        ...doc,
        lines,
        status: allIn ? "received" : anyIn ? "partial" : doc.status,
        receivedAt: allIn || anyIn ? new Date().toISOString() : doc.receivedAt,
      };
    });
  }

  async cancel(id: string) {
    return this.mutate(id, (doc) => {
      if (["received", "closed", "cancelled"].includes(doc.status)) {
        throw new BadRequestException("This order can no longer be cancelled");
      }
      return { ...doc, status: "cancelled" };
    });
  }

  async close(id: string) {
    return this.mutate(id, (doc) => {
      if (!["received", "partial"].includes(doc.status)) {
        throw new BadRequestException("Receive goods before closing the order");
      }
      return { ...doc, status: "closed" };
    });
  }
}
