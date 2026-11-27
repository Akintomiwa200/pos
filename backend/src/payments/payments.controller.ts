import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SetupService } from "../console/setup.service";
import { SalesService } from "../sales/sales.service";

type ChargeBody = {
  tender?: string;
  provider?: string;
  amountMinor?: number;
  parts?: number;
  reference?: string;
};

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly sales: SalesService,
    private readonly setup: SetupService,
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
   * tenders require an enabled HQ gateway and return a hand-off reference. A
   * terminal must only record the sale after it receives an explicit success
   * confirmation from the provider or the cashier's manual confirmation.
   */
  @Post("charge")
  charge(@Body() body: ChargeBody) {
    const amountMinor = Math.round(Number(body.amountMinor ?? 0));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException("A positive amountMinor is required");
    }
    const parts = Math.max(1, Math.min(12, Math.round(Number(body.parts ?? 1) || 1)));
    const tender = String(body.tender ?? "cash").trim().toLowerCase() || "cash";
    const manual = tender === "cash" || tender === "split" || tender === "gift-card";
    const gateways = this.setup.listGateways().filter((gateway) => gateway.enabled);

    if (!manual) {
      const requested = String(body.provider ?? "").trim().toLowerCase();
      const gateway =
        (requested
          ? gateways.find((row) => row.provider === requested)
          : gateways.find((row) => row.isDefault) ?? gateways[0]) ?? undefined;
      if (!gateway) {
        throw new ServiceUnavailableException(
          `No enabled payment gateway is configured for ${tender}`,
        );
      }
      return {
        status: "in_progress",
        currency: "NGN",
        tender,
        provider: gateway.provider,
        gatewayId: gateway.id,
        amountMinor,
        splitParts: parts,
        reference: String(body.reference ?? "").trim() || this.paymentReference(tender),
      };
    }

    return {
      status: "paid",
      currency: "NGN",
      tender,
      provider: "manual",
      amountMinor,
      splitParts: parts,
      reference: String(body.reference ?? "").trim() || this.paymentReference(tender),
    };
  }

  private paymentReference(tender: string) {
    return `${tender.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }
}
