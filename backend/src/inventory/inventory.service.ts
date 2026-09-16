import { Injectable, OnModuleInit } from "@nestjs/common";
import { join } from "node:path";
import { Observable, Subject } from "rxjs";
import { CatalogModule } from "../catalog/catalog.module";
import { CatalogService } from "../catalog/catalog.service";
import { SetupService } from "../console/setup.service";
import {
  InventoryStore,
  readMovements,
  type MovementInput,
  type StockLevel,
  type StockMovement,
} from "./inventory.store";

export type InventoryEvent = {
  type: "snapshot";
  levels: StockLevel[];
  movements: StockMovement[];
  at: string;
};

@Injectable()
export class InventoryService implements OnModuleInit {
  private store!: InventoryStore;
  private readonly file = join(process.cwd(), "data", "stock-movements.json");
  private readonly events = new Subject<InventoryEvent>();

  constructor(
    private readonly catalog: CatalogService,
    private readonly setup: SetupService,
  ) {}

  async onModuleInit() {
    this.store = new InventoryStore(this.catalog, this.file);
    await readMovements(this.file);
  }

  private async snapshot(): Promise<InventoryEvent> {
    const lowStockQty = this.setup.snapshot().settings?.lowStockQty ?? 8;
    return {
      type: "snapshot",
      levels: this.store.levels(lowStockQty),
      movements: await this.store.movements(),
      at: new Date().toISOString(),
    };
  }

  private publish() {
    void this.snapshot()
      .then((event) => this.events.next(event))
      .catch(() => undefined);
  }

  /** Server-sent events: stock levels + movement history, pushed on each change. */
  stream(): Observable<InventoryEvent> {
    return new Observable((subscriber) => {
      void this.snapshot()
        .then((event) => subscriber.next(event))
        .catch(() => undefined);
      const sub = this.events.subscribe(subscriber);
      return () => sub.unsubscribe();
    });
  }

  levels(): StockLevel[] {
    const lowStockQty = this.setup.snapshot().settings?.lowStockQty ?? 8;
    return this.store.levels(lowStockQty);
  }

  movements(): Promise<StockMovement[]> {
    return this.store.movements();
  }

  async record(input: MovementInput): Promise<StockMovement> {
    const movement = await this.store.recordMovement(input);
    this.publish();
    return movement;
  }

  /** Record several movements in one operation and push a single live snapshot. */
  async recordBatch(input: {
    type?: string;
    from?: string;
    to?: string;
    reason?: string;
    staff?: string;
    at?: string;
    lines?: Array<{
      itemId?: string;
      quantity?: number;
      countedOnHand?: number;
      reason?: string;
      at?: string;
    }>;
  }): Promise<StockMovement[]> {
    const { lines = [], ...base } = input;
    const movements: StockMovement[] = [];
    for (const line of lines) {
      movements.push(await this.store.recordMovement({ ...base, ...line }));
    }
    this.publish();
    return movements;
  }
}

export { CatalogModule };
