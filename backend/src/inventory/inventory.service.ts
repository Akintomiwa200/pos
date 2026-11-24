import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { join } from "node:path";
import { Observable, Subject } from "rxjs";
import { CatalogModule } from "../catalog/catalog.module";
import { CatalogService } from "../catalog/catalog.service";
import { SetupService } from "../console/setup.service";
import {
  InventoryStore,
  readMovements,
  writeMovements,
  type MovementInput,
  type StockLevel,
  type StockMovement,
} from "./inventory.store";

export type InventoryViewer = {
  id?: string;
  isSuperAdmin?: boolean;
  companyId?: string | null;
  name?: string;
};

export type InventoryEvent = {
  type: "snapshot";
  levels: StockLevel[];
  movements: StockMovement[];
  /** Company that triggered the change; undefined for the initial snapshot. */
  companyId?: string | null;
  at: string;
};

type BatchLine = {
  itemId?: string;
  quantity?: number;
  countedOnHand?: number;
  reason?: string;
  at?: string;
  runId?: string;
};

@Injectable()
export class InventoryService implements OnModuleInit {
  private store!: InventoryStore;
  private readonly file = join(process.cwd(), "data", "stock-movements.json");
  private readonly events = new Subject<InventoryEvent>();
  /** Serializes ledger writes so concurrent counts cannot overwrite each other. */
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly catalog: CatalogService,
    private readonly setup: SetupService,
  ) {}

  async onModuleInit() {
    this.store = new InventoryStore(this.catalog, this.file);
    await readMovements(this.file);
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(work, work);
    this.writeQueue = result.catch(() => undefined);
    return result;
  }

  private visibleMovements(rows: StockMovement[], viewer?: InventoryViewer) {
    if (!viewer || viewer.isSuperAdmin) return rows;
    const companyId = viewer.companyId ?? "__none__";
    const legacyCompanyId = this.setup.getCompany()?.id ?? null;
    return rows.filter(
      (row) => row.companyId === companyId || (!row.companyId && legacyCompanyId === companyId),
    );
  }

  private scopeEvent(event: InventoryEvent, viewer?: InventoryViewer): InventoryEvent {
    return { ...event, movements: this.visibleMovements(event.movements, viewer) };
  }

  private async snapshot(viewer?: InventoryViewer): Promise<InventoryEvent> {
    const lowStockQty = this.setup.snapshot().settings?.lowStockQty ?? 8;
    return {
      type: "snapshot",
      levels: this.store.levels(lowStockQty),
      movements: this.visibleMovements(await this.store.movements(), viewer),
      at: new Date().toISOString(),
    };
  }

  private async publish(companyId?: string | null) {
    const event = await this.snapshot();
    this.events.next({ ...event, companyId });
  }

  /** Real-time stock levels + movement history, pushed on each change. */
  stream(viewer?: InventoryViewer): Observable<InventoryEvent> {
    return new Observable((subscriber) => {
      void this.snapshot(viewer)
        .then((event) => subscriber.next(event))
        .catch(() => undefined);
      const sub = this.events.subscribe((event) => subscriber.next(this.scopeEvent(event, viewer)));
      return () => sub.unsubscribe();
    });
  }

  levels(): StockLevel[] {
    const lowStockQty = this.setup.snapshot().settings?.lowStockQty ?? 8;
    return this.store.levels(lowStockQty);
  }

  async movements(viewer?: InventoryViewer): Promise<StockMovement[]> {
    return this.visibleMovements(await this.store.movements(), viewer);
  }

  async record(input: MovementInput, viewer?: InventoryViewer): Promise<StockMovement> {
    return this.enqueue(async () => {
      const movement = await this.store.recordMovement({
        ...input,
        companyId: viewer?.isSuperAdmin ? (input.companyId ?? null) : (viewer?.companyId ?? null),
        staff: viewer?.name,
      });
      await this.publish(movement.companyId);
      return movement;
    });
  }

  /** Validate and deduplicate a whole sheet before touching the ledger. */
  private prepareBatch(lines: BatchLine[] | undefined) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new BadRequestException("No stock lines were supplied");
    }
    const items = this.catalog.list();
    const byId = new Map<string, (typeof items)[number]>();
    for (const item of items) byId.set(item.id, item);

    const prepared = new Map<string, BatchLine & { itemId: string }>();
    for (const line of lines) {
      const itemId = line.itemId?.trim() ?? "";
      if (!itemId) throw new BadRequestException("Every stock line needs an item");
      const item = byId.get(itemId);
      if (!item) throw new NotFoundException(`Item not found in catalog: ${itemId}`);
      if (typeof line.countedOnHand === "number") {
        if (!Number.isInteger(line.countedOnHand) || line.countedOnHand < 0) {
          throw new BadRequestException("Physical counts must be whole numbers of zero or more");
        }
      }
      if (line.quantity !== undefined && !Number.isInteger(line.quantity)) {
        throw new BadRequestException("Stock quantities must be whole numbers");
      }
      if (prepared.has(itemId)) {
        throw new BadRequestException(`Duplicate item in stock sheet: ${item.name}`);
      }
      prepared.set(itemId, { ...line, itemId });
    }
    return [...prepared.values()];
  }

  /** Record several movements in one serialized operation and push a single live snapshot. */
  async recordBatch(
    input: {
      type?: string;
      from?: string;
      to?: string;
      reason?: string;
      staff?: string;
      companyId?: string | null;
      at?: string;
      runId?: string;
      lines?: BatchLine[];
    },
    viewer?: InventoryViewer,
  ): Promise<StockMovement[]> {
    const lines = this.prepareBatch(input.lines);
    return this.enqueue(async () => {
      const base = {
        type: input.type,
        from: input.from,
        to: input.to,
        reason: input.reason,
        at: input.at,
        runId: input.runId,
      };
      const companyId = viewer?.isSuperAdmin
        ? (input.companyId ?? null)
        : (viewer?.companyId ?? null);
      const runId = base.runId || this.nextRunId(
        base.type === "transfer" ? "TRF" : base.type === "count" ? "CNT" : "ADJ",
      );
      const beforeRows = await this.store.movements();
      const beforeOnHand = new Map<string, number>();
      for (const line of lines) {
        const item = this.catalog.list().find((row) => row.id === line.itemId);
        if (item) beforeOnHand.set(item.id, item.onHand);
      }

      const movements: StockMovement[] = [];
      try {
        for (const line of lines) {
          movements.push(
            await this.store.recordMovement({
              ...base,
              ...line,
              companyId,
              staff: viewer?.name,
              runId: line.runId || runId,
            }),
          );
        }
      } catch (error) {
        for (const [itemId, onHand] of beforeOnHand) {
          try {
            this.catalog.update(itemId, { onHand });
          } catch {
            /* keep restoring the remaining lines */
          }
        }
        await writeMovements(this.file, beforeRows).catch(() => undefined);
        throw error;
      }

      await this.publish(companyId);
      return movements;
    });
  }

  /** Human-friendly reference shared by every line in one stock batch. */
  private nextRunId(prefix: string): string {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${rand}`;
  }
}

export { CatalogModule };
