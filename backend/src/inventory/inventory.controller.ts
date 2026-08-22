import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import type { StockMovement } from "./inventory.store";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  levels(@Query("low") lowOnly?: string) {
    const rows = this.inventory.levels();
    if (lowOnly === "1" || lowOnly === "true") {
      return rows.filter((row) => row.onHand <= row.reorderPoint);
    }
    return rows;
  }

  @Get("movements")
  movements(@Query("itemId") itemId?: string): Promise<StockMovement[]> {
    return this.inventory.movements().then((rows) =>
      itemId
        ? rows.filter((row) => row.itemId === itemId || row.itemName === itemId)
        : rows,
    );
  }

  @Post("movements")
  record(
    @Body()
    body: {
      type?: string;
      itemId?: string;
      quantity?: number;
      from?: string;
      to?: string;
      countedOnHand?: number;
      reason?: string;
      staff?: string;
    },
  ) {
    return this.inventory.record(body ?? {});
  }
}
