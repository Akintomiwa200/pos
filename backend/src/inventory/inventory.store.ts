import { NotFoundException } from "@nestjs/common";
import { CatalogService } from "../catalog/catalog.service";

export type StockLevel = {
  itemId: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  onHand: number;
  reorderPoint: number;
  valueMinor: number;
  unit: string;
  unitLabel?: string;
  packSize: number;
};

export type StockMovement = {
  id: string;
  at: string;
  type: "transfer" | "adjustment" | "count";
  itemId: string;
  itemName: string;
  quantity: number;
  from?: string;
  to?: string;
  countedOnHand?: number;
  reason?: string;
  staff?: string;
};

export type MovementInput = {
  type?: string;
  itemId?: string;
  quantity?: number;
  from?: string;
  to?: string;
  countedOnHand?: number;
  reason?: string;
  staff?: string;
};

export function levelFromItem(
  item: {
    id: string;
    name: string;
    category: string;
    sku: string;
    barcode: string;
    onHand: number;
    priceMinor: number;
    costMinor?: number;
    reorderLevel?: number;
    unit?: string;
    unitLabel?: string;
    packSize?: number;
  },
  defaultReorderPoint: number,
): StockLevel {
  const unitCost = item.costMinor && item.costMinor > 0 ? item.costMinor : item.priceMinor;
  return {
    itemId: item.id,
    name: item.name,
    category: item.category,
    sku: item.sku,
    barcode: item.barcode,
    onHand: item.onHand,
    reorderPoint: item.reorderLevel ?? defaultReorderPoint,
    valueMinor: item.onHand * unitCost,
    unit: item.unit ?? "each",
    unitLabel: item.unitLabel,
    packSize: Math.max(1, item.packSize ?? 1),
  };
}

export async function readMovements(file: string): Promise<StockMovement[]> {
  try {
    const raw = await import("node:fs/promises").then((fs) => fs.readFile(file, "utf8"));
    const parsed = JSON.parse(raw) as StockMovement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeMovements(file: string, rows: StockMovement[]) {
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(file.slice(0, file.lastIndexOf("/") || file.lastIndexOf("\\")), { recursive: true }),
  );
  await import("node:fs/promises").then((fs) => fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8"));
}

export class InventoryStore {
  constructor(
    private readonly catalog: CatalogService,
    private readonly file: string,
  ) {}

  levels(defaultReorderPoint: number): StockLevel[] {
    return this.catalog.list().map((item) => levelFromItem(item, defaultReorderPoint));
  }

  async movements(): Promise<StockMovement[]> {
    return readMovements(this.file);
  }

  async recordMovement(input: MovementInput): Promise<StockMovement> {
    const type =
      input.type === "transfer" || input.type === "adjustment" || input.type === "count"
        ? input.type
        : null;
    if (!type) throw new NotFoundException("Movement type must be transfer, adjustment, or count");
    const item = this.catalog
      .list()
      .find((row) => row.id === (input.itemId ?? "").trim());
    if (!item) throw new NotFoundException("Item not found in catalog");

    let quantity = Math.round(input.quantity ?? 0);
    if (type !== "transfer") {
      if (typeof input.countedOnHand === "number" && Number.isFinite(input.countedOnHand)) {
        quantity = Math.round(input.countedOnHand) - item.onHand;
        this.catalog.update(item.id, { onHand: Math.max(0, Math.round(input.countedOnHand)) });
      } else if (quantity !== 0) {
        this.catalog.update(item.id, { onHand: Math.max(0, item.onHand + quantity) });
      }
    }

    const movement: StockMovement = {
      id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      type,
      itemId: item.id,
      itemName: item.name,
      quantity,
      from: input.from,
      to: input.to,
      countedOnHand:
        typeof input.countedOnHand === "number" ? Math.max(0, Math.round(input.countedOnHand)) : undefined,
      reason: input.reason?.trim() || undefined,
      staff: input.staff?.trim() || undefined,
    };
    const rows = await this.movements();
    await writeMovements(this.file, [movement, ...rows].slice(0, 5000));
    return movement;
  }
}
