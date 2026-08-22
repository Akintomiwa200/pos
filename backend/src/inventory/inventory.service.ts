import { Injectable, OnModuleInit } from "@nestjs/common";
import { join } from "node:path";
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

@Injectable()
export class InventoryService implements OnModuleInit {
  private store!: InventoryStore;
  private readonly file = join(process.cwd(), "data", "stock-movements.json");

  constructor(
    private readonly catalog: CatalogService,
    private readonly setup: SetupService,
  ) {}

  async onModuleInit() {
    this.store = new InventoryStore(this.catalog, this.file);
    await readMovements(this.file);
  }

  levels(): StockLevel[] {
    const lowStockQty = this.setup.snapshot().settings?.lowStockQty ?? 8;
    return this.store.levels(lowStockQty);
  }

  movements(): Promise<StockMovement[]> {
    return this.store.movements();
  }

  record(input: MovementInput): Promise<StockMovement> {
    return this.store.recordMovement(input);
  }
}

export { CatalogModule };
