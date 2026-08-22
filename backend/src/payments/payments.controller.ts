import { Body, Controller, Get, Post } from "@nestjs/common";
import { SalesService } from "../sales/sales.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  list() {
    const rows = this.sales.list();
    const byTender = new Map<string, { tender: string; totalMinor: number; count: number }>();
    for (const sale of rows) {
      const row =
        byTender.get(sale.tender) ?? { tender: sale.tender, totalMinor: 0, count: 0 };
      row.totalMinor += sale.totalMinor;
      row.count += 1;
      byTender.set(sale.tender, row);
    }
    return {
      transactions: rows.map((sale) => ({
        ticketId: sale.ticketId,
        paidAt: sale.paidAt,
        tender: sale.tender,
        totalMinor: sale.totalMinor,
        cashierName: sale.cashierName,
      })),
      settlements: [...byTender.values()].sort((a, b) => b.totalMinor - a.totalMinor),
    };
  }

  @Post("charge")
  charge(
    @Body()
    body: {
      tender?: string;
      provider?: string;
      amountMinor?: number;
      parts?: number;
    },
  ) {
    return {
      status: "in_progress",
      currency: "NGN",
      tender: body.tender ?? "cash",
      provider: body.provider ?? "paystack",
      amountMinor: body.amountMinor ?? 500000,
      splitParts: body.parts ?? 1,
    };
  }
}
