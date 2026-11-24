import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Sse,
  UnauthorizedException,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { ConsoleService } from "../console/console.service";
import {
  InventoryService,
  type InventoryEvent,
  type InventoryViewer,
} from "./inventory.service";
import type { StockMovement } from "./inventory.store";

function bearer(header?: string) {
  return header?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

@Controller("inventory")
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly consoleService: ConsoleService,
  ) {}

  private async viewer(
    authorization?: string,
    token?: string,
  ): Promise<InventoryViewer> {
    const resolved = token?.trim() || bearer(authorization);
    if (!resolved) throw new UnauthorizedException("Sign in to manage stock");
    const me = await this.consoleService.me(resolved);
    if (me.locked) throw new UnauthorizedException(me.locked.message);
    return {
      id: me.user.id,
      name: me.user.name,
      companyId: me.user.companyId,
      isSuperAdmin: Boolean(me.user.isSuperAdmin),
    };
  }

  private async audit(
    viewer: InventoryViewer,
    action: string,
    target?: string,
    detail?: string,
  ) {
    await this.consoleService.recordActivity({
      actorId: viewer.id,
      actorName: viewer.name,
      action,
      target,
      detail,
    });
  }

  @Get()
  async levels(
    @Headers("authorization") authorization?: string,
    @Query("low") lowOnly?: string,
  ) {
    await this.viewer(authorization);
    const rows = this.inventory.levels();
    if (lowOnly === "1" || lowOnly === "true") {
      return rows.filter((row) => row.onHand <= row.reorderPoint);
    }
    return rows;
  }

  @Sse("stream")
  async stream(
    @Query("token") token?: string,
    @Headers("authorization") authorization?: string,
  ): Promise<Observable<{ data: InventoryEvent }>> {
    const viewer = await this.viewer(authorization, token);
    return this.inventory.stream(viewer).pipe(map((data) => ({ data })));
  }

  @Get("movements")
  async movements(
    @Headers("authorization") authorization?: string,
    @Query("itemId") itemId?: string,
  ): Promise<StockMovement[]> {
    const viewer = await this.viewer(authorization);
    const rows = await this.inventory.movements(viewer);
    return itemId
      ? rows.filter((row) => row.itemId === itemId || row.itemName === itemId)
      : rows;
  }

  @Post("movements")
  async record(
    @Headers("authorization") authorization: string | undefined,
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
      companyId?: string | null;
    },
  ) {
    const viewer = await this.viewer(authorization);
    const movement = await this.inventory.record(body ?? {}, viewer);
    await this.audit(
      viewer,
      `stock.${movement.type}.posted`,
      movement.itemName,
      `${movement.id} · ${movement.quantity >= 0 ? "+" : ""}${movement.quantity}`,
    );
    return movement;
  }

  @Post("movements/batch")
  async recordBatch(
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      type?: string;
      from?: string;
      to?: string;
      reason?: string;
      staff?: string;
      companyId?: string | null;
      at?: string;
      runId?: string;
      lines?: Array<{
        itemId?: string;
        quantity?: number;
        countedOnHand?: number;
        reason?: string;
        at?: string;
        runId?: string;
      }>;
    },
  ) {
    const viewer = await this.viewer(authorization);
    const movements = await this.inventory.recordBatch(body ?? {}, viewer);
    const first = movements[0];
    await this.audit(
      viewer,
      `stock.${first?.type ?? "movement"}.batch`,
      first?.runId ?? first?.id,
      `${movements.length} line${movements.length === 1 ? "" : "s"} · ${body?.reason ?? ""}`.trim(),
    );
    return movements;
  }
}
