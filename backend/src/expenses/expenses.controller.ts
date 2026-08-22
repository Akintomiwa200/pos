import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ExpensesService } from "./expenses.service";
import type { Expense } from "./expenses.types";

@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@Query("account") account?: string) {
    return this.expenses.list(account);
  }

  @Post()
  save(@Body() body: Partial<Expense>) {
    return this.expenses.save(body ?? {});
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.expenses.delete(id);
  }
}
