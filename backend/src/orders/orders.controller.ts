import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import type { TradeDoc } from "./orders.types";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get("summary")
  summary(@Query("kind") kind?: string) {
    return this.orders.summary(kind || "purchase-order");
  }

  @Get()
  list(@Query("kind") kind?: string) {
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

  @Post(":id/submit")
  submit(@Param("id") id: string) {
    return this.orders.submit(id);
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() body?: { approvedBy?: string }) {
    return this.orders.approve(id, body);
  }

  @Post(":id/reject")
  reject(
    @Param("id") id: string,
    @Body() body?: { rejectedBy?: string; reason?: string },
  ) {
    return this.orders.reject(id, body);
  }

  @Post(":id/send")
  send(@Param("id") id: string) {
    return this.orders.send(id);
  }

  @Post(":id/receive")
  receive(
    @Param("id") id: string,
    @Body() body?: { lines?: Array<{ index: number; receivedQty: number }>; full?: boolean },
  ) {
    return this.orders.receive(id, body);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.orders.cancel(id);
  }

  @Post(":id/close")
  close(@Param("id") id: string) {
    return this.orders.close(id);
  }
}
