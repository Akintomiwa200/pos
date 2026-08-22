import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import type { TradeDoc } from "./orders.types";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query("kind") kind?: string) {
    if (kind && !/^[a-z-]+$/.test(kind)) throw new NotFoundException("Unknown kind");
    return this.orders.list(kind);
  }

  @Get(":id")
  one(@Param("id") id: string) {
    return this.orders.get(id);
  }

  @Post()
  save(@Body() body: Partial<TradeDoc>) {
    return this.orders.save(body ?? {});
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.orders.delete(id);
  }
}
