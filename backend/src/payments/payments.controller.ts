import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Sse,
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { map } from "rxjs";
import { SalesService } from "../sales/sales.service";
import { PaymentsService } from "./payments.service";
import type { ChargeInput, VerifyInput } from "./payments.types";

type RawRequest = ExpressRequest & { rawBody?: Buffer };

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly sales: SalesService,
    private readonly payments: PaymentsService,
  ) {}

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

  /**
   * Starts a payment attempt. Manual tenders are confirmed locally; electronic
   * tenders call the real provider and return a hosted-checkout hand-off. A
   * terminal must only record the sale after an explicit status check.
   */
  @Post("charge")
  charge(@Body() body: ChargeInput) {
    return this.payments.charge(body);
  }

  /** Cashier-triggered status check; never called on a timer by the POS. */
  @Post("verify")
  verify(@Body() body: VerifyInput) {
    return this.payments.verify(body);
  }

  @Get("events")
  events(
    @Query("provider") provider?: string,
    @Query("reference") reference?: string,
  ) {
    return this.payments.listEvents({
      provider: provider?.trim() || undefined,
      reference: reference?.trim() || undefined,
    });
  }

  @Sse("events/stream")
  eventStream() {
    return this.payments.eventStream().pipe(map((data) => ({ data })));
  }

  /**
   * Provider webhook. Signature verification uses the raw bytes captured by
   * express.json's verify hook in main.ts, never a re-serialized body.
   */
  @Post("webhooks/:provider")
  async webhook(
    @Param("provider") provider: string,
    @Req() request: RawRequest,
    @Body() body: unknown,
  ) {
    if (!request.rawBody || !Buffer.isBuffer(request.rawBody)) {
      throw new BadRequestException("Raw webhook body was not captured");
    }
    return this.payments.handleWebhook(provider, request.headers, request.rawBody, body);
  }
}
