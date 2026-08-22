import { Injectable } from "@nestjs/common";
import { CatalogService } from "../catalog/catalog.service";
import { SetupService } from "../console/setup.service";
import { OrdersService } from "../orders/orders.service";
import { SalesService, type StoredSale } from "../sales/sales.service";

export type TenderTotal = { tender: string; totalMinor: number; count: number };

export type DayReport = {
  kind: "X" | "Z";
  day: string;
  netMinor: number;
  transactions: number;
  cashExpectedMinor: number;
  tenders: TenderTotal[];
  closed?: boolean;
};

export type TaxLine = {
  ref: string;
  at: string;
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
};

export type TaxSummary = {
  ratePercent: number;
  inclusive: boolean;
  outputTaxMinor: number;
  inputTaxMinor: number;
  liabilityMinor: number;
  lines: TaxLine[];
  byCategory: Array<{ category: string; netMinor: number; taxMinor: number }>;
};

const sameDay = (iso: string, day: string) => iso.slice(0, 10) === day;

@Injectable()
export class ReportsService {
  constructor(
    private readonly sales: SalesService,
    private readonly catalog: CatalogService,
    private readonly orders: OrdersService,
    private readonly setup: SetupService,
  ) {}

  private daySales(day: string): StoredSale[] {
    return this.sales.list().filter((sale) => sameDay(sale.paidAt, day));
  }

  xReport(day = new Date().toISOString().slice(0, 10)): DayReport {
    return this.dayReport("X", day);
  }

  zReport(day = new Date().toISOString().slice(0, 10)): DayReport {
    const report = this.dayReport("Z", day);
    const closed = !this.daySales(day).some((sale) => sale.paidAt > new Date(Date.now() - 15 * 60_000).toISOString());
    return { ...report, closed };
  }

  private dayReport(kind: "X" | "Z", day: string): DayReport {
    const rows = this.daySales(day);
    const tenderMap = new Map<string, TenderTotal>();
    let net = 0;
    for (const sale of rows) {
      net += sale.totalMinor;
      const current = tenderMap.get(sale.tender) ?? { tender: sale.tender, totalMinor: 0, count: 0 };
      current.totalMinor += sale.totalMinor;
      current.count += 1;
      tenderMap.set(sale.tender, current);
    }
    const tenders = [...tenderMap.values()].sort((a, b) => b.totalMinor - a.totalMinor);
    const cashExpectedMinor = tenders
      .filter((row) => row.tender.toLowerCase() === "cash")
      .reduce((sum, row) => sum + row.totalMinor, 0);
    return {
      kind,
      day,
      netMinor: net,
      transactions: rows.length,
      cashExpectedMinor,
      tenders,
    };
  }

  taxSummary(day?: string): TaxSummary {
    const taxes = this.setup.snapshot().taxes.filter((tax) => tax.active && tax.isDefault);
    const vat = taxes[0] ?? { name: "VAT", ratePercent: 7.5, inclusive: false };
    const rate = vat.ratePercent / 100;
    const inclusive = vat.inclusive || this.setup.snapshot().settings.pricesIncludeVat;

    const salesRows = day ? this.sales.list().filter((sale) => sameDay(sale.paidAt, day)) : this.sales.list();
    const lines: TaxLine[] = salesRows.map((sale) => {
      const gross = sale.totalMinor;
      const net = inclusive ? Math.round(gross / (1 + rate)) : gross;
      return {
        ref: sale.ticketId,
        at: sale.paidAt,
        netMinor: net,
        taxMinor: gross - net,
        grossMinor: gross,
      };
    });

    const purchaseDocs = this.orders.list("purchase-invoice").filter((doc) => doc.status !== "cancelled");
    const inputTaxMinor = purchaseDocs.reduce((sum, doc) => {
      const net = inclusive ? Math.round(doc.totalMinor / (1 + rate)) : doc.totalMinor;
      return sum + (doc.totalMinor - net);
    }, 0);

    const categoryOf = new Map(this.catalog.list().map((item) => [item.id, item.category] as const));
    const catMap = new Map<string, { category: string; grossMinor: number }>();
    for (const sale of salesRows) {
      const lines = sale.lines ?? [];
      const seenCategories =
        categoriesOf(lines, categoryOf).size > 0
          ? categoriesOf(lines, categoryOf)
          : new Set(["General"]);
      for (const line of lines) {
        const lineGross = line.unitPriceMinor * line.quantity;
        if (!lineGross) continue;
        const category = categoryOf.get(line.itemId ?? "") ?? "General";
        const row = catMap.get(category) ?? { category, grossMinor: 0 };
        row.grossMinor += lineGross;
        catMap.set(category, row);
      }
      void seenCategories;
    }
    const byCategory = [...catMap.values()].map((row) => {
      const net = inclusive ? Math.round(row.grossMinor / (1 + rate)) : row.grossMinor;
      return { category: row.category, netMinor: net, taxMinor: row.grossMinor - net };
    });

    const outputTaxMinor = lines.reduce((sum, line) => sum + line.taxMinor, 0);
    return {
      ratePercent: vat.ratePercent,
      inclusive,
      outputTaxMinor,
      inputTaxMinor,
      liabilityMinor: outputTaxMinor - inputTaxMinor,
      lines,
      byCategory: byCategory.sort((a, b) => b.netMinor - a.netMinor),
    };
  }
}

function categoriesOf(
  lines: Array<{ itemId?: string }>,
  categoryOf: Map<string, string>,
): Set<string> {
  const out = new Set<string>();
  for (const line of lines) {
    const id = line.itemId ?? "";
    if (categoryOf.has(id)) out.add(categoryOf.get(id)!);
  }
  return out;
}
