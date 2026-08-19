import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { SalesService, type StoredSale } from "./sales.service";

@Controller("sales")
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  list() {
    return this.sales.list();
  }

  @Get(":ticketId")
  one(@Param("ticketId") ticketId: string) {
    const sale = this.sales.get(ticketId);
    if (!sale) throw new NotFoundException("Sale not found");
    return sale;
  }

  @Post()
  record(@Body() body: StoredSale) {
    return this.sales.record(body);
  }
}
