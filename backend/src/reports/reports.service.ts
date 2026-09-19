import { Injectable } from "@nestjs/common";
import { Observable, Subject, merge, interval, map, startWith } from "rxjs";
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
  byRate: Array<{ ratePercent: number; netMinor: number; taxMinor: number }>;
};

export type AuditCashier = {
  name: string;
  tickets: number;
  totalMinor: number;
  lastAt: string;
};

export type AuditTicket = {
  ticketId: string;
  paidAt: string;
  tender: string;
  cashierName: string;
  totalMinor: number;
  lines: number;
  units: number;
};

export type AuditException = {
  id: string;
  at: string;
  kind: "zero" | "high" | "no-lines" | "refund-like";
  ticketId: string;
  detail: string;
  amountMinor: number;
};

export type AuditSnapshot = {
  day: string;
  updatedAt: string;
  x: DayReport;
  z: DayReport;
  tickets: AuditTicket[];
  cashiers: AuditCashier[];
  exceptions: AuditException[];
  avgTicketMinor: number;
  unitsSold: number;
};

export type AuditEvent =
  | { type: "snapshot"; data: AuditSnapshot }
  | { type: "ping"; at: string };

const sameDay = (iso: string, day: string) => iso.slice(0, 10) === day;

@Injectable()
export class ReportsService {
  private readonly auditEvents = new Subject<AuditEvent>();

  constructor(
    private readonly sales: SalesService,
    private readonly catalog: CatalogService,
    private readonly orders: OrdersService,
    private readonly setup: SetupService,
  ) {
    this.sales.salesEvents().subscribe(() => {
      this.auditEvents.next({ type: "snapshot", data: this.auditSnapshot() });
    });
  }

  private daySales(day: string): StoredSale[] {
    return this.sales.list().filter((sale) => sameDay(sale.paidAt, day));
  }

  xReport(day = new Date().toISOString().slice(0, 10)): DayReport {
    return this.dayReport("X", day);
  }

  zReport(day = new Date().toISOString().slice(0, 10)): DayReport {
    const report = this.dayReport("Z", day);
    const closed = !this.daySales(day).some(
      (sale) => sale.paidAt > new Date(Date.now() - 15 * 60_000).toISOString(),
    );
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

  auditSnapshot(day = new Date().toISOString().slice(0, 10)): AuditSnapshot {
    const rows = this.daySales(day);
    const x = this.xReport(day);
    const z = this.zReport(day);

    const tickets: AuditTicket[] = rows.map((sale) => ({
      ticketId: sale.ticketId,
      paidAt: sale.paidAt,
      tender: sale.tender,
      cashierName: sale.cashierName || "Unknown",
      totalMinor: sale.totalMinor,
      lines: sale.lines?.length ?? 0,
      units: (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0),
    }));

    const cashierMap = new Map<string, AuditCashier>();
    for (const sale of rows) {
      const name = sale.cashierName || "Unknown";
      const row = cashierMap.get(name) ?? { name, tickets: 0, totalMinor: 0, lastAt: sale.paidAt };
      row.tickets += 1;
      row.totalMinor += sale.totalMinor;
      if (sale.paidAt > row.lastAt) row.lastAt = sale.paidAt;
      cashierMap.set(name, row);
    }
    const cashiers = [...cashierMap.values()].sort((a, b) => b.totalMinor - a.totalMinor);

    const avgTicketMinor = rows.length
      ? Math.round(rows.reduce((sum, sale) => sum + sale.totalMinor, 0) / rows.length)
      : 0;
    const unitsSold = tickets.reduce((sum, row) => sum + row.units, 0);
    const highThreshold = Math.max(50_000_00, avgTicketMinor * 5);

    const exceptions: AuditException[] = [];
    for (const sale of rows) {
      if (sale.totalMinor === 0) {
        exceptions.push({
          id: `zero-${sale.ticketId}`,
          at: sale.paidAt,
          kind: "zero",
          ticketId: sale.ticketId,
          detail: "Zero-value ticket",
          amountMinor: 0,
        });
      }
      if (!(sale.lines?.length > 0)) {
        exceptions.push({
          id: `nolines-${sale.ticketId}`,
          at: sale.paidAt,
          kind: "no-lines",
          ticketId: sale.ticketId,
          detail: "Ticket has no line items",
          amountMinor: sale.totalMinor,
        });
      }
      if (sale.totalMinor >= highThreshold) {
        exceptions.push({
          id: `high-${sale.ticketId}`,
          at: sale.paidAt,
          kind: "high",
          ticketId: sale.ticketId,
          detail: "Unusually high ticket vs day average",
          amountMinor: sale.totalMinor,
        });
      }
      if (sale.totalMinor < 0) {
        exceptions.push({
          id: `refund-${sale.ticketId}`,
          at: sale.paidAt,
          kind: "refund-like",
          ticketId: sale.ticketId,
          detail: "Negative total — treat as refund / adjustment",
          amountMinor: sale.totalMinor,
        });
      }
    }
    exceptions.sort((a, b) => b.at.localeCompare(a.at));

    return {
      day,
      updatedAt: new Date().toISOString(),
      x,
      z,
      tickets,
      cashiers,
      exceptions,
      avgTicketMinor,
      unitsSold,
    };
  }

  auditStream(): Observable<AuditEvent> {
    const ticks = interval(8_000).pipe(
      map(() => ({ type: "snapshot" as const, data: this.auditSnapshot() })),
      startWith({ type: "snapshot" as const, data: this.auditSnapshot() }),
    );
    return merge(ticks, this.auditEvents.asObservable());
  }

  taxSummary(day?: string): TaxSummary {
    const snap = this.setup.snapshot();
    const taxes = snap.taxes.filter((tax) => tax.active && tax.isDefault);
    const vat = taxes[0] ?? { name: "VAT", ratePercent: 7.5, inclusive: false };
    const inclusive = vat.inclusive || snap.settings.pricesIncludeVat;
    // Master switch: when VAT is off app-wide, every line is treated as exempt.
    const vatOff = snap.settings.applyVat === false;
    const defaultRate = vatOff ? 0 : vat.ratePercent;

    const netOf = (gross: number, rate: number) =>
      inclusive && rate > 0 ? Math.round((gross * 100) / (100 + rate)) : gross;
    const taxOf = (gross: number, rate: number) =>
      inclusive && rate > 0
        ? gross - netOf(gross, rate)
        : Math.round(netOf(gross, rate) * (rate / 100));

    const salesRows = day
      ? this.sales.list().filter((sale) => sameDay(sale.paidAt, day))
      : this.sales.list();

    const lines: TaxLine[] = [];
    const rateMap = new Map<number, { netMinor: number; taxMinor: number }>();
    const categoryOf = new Map(this.catalog.list().map((item) => [item.id, item.category] as const));
    const catMap = new Map<string, { category: string; netMinor: number; taxMinor: number }>();

    for (const sale of salesRows) {
      const saleLines = sale.lines ?? [];
      const rateOf = (rate: number | undefined) =>
        typeof rate === "number" && rate > 0 ? rate : defaultRate;

      if (!saleLines.length) {
        // Legacy sales without stored lines: one entry at the default rate.
        const rate = defaultRate;
        const gross = sale.totalMinor;
        const net = netOf(gross, rate);
        const tax = taxOf(gross, rate);
        if (rate > 0) {
          lines.push({ ref: sale.ticketId, at: sale.paidAt, netMinor: net, taxMinor: tax, grossMinor: gross });
        }
        const bucket = rateMap.get(rate) ?? { netMinor: 0, taxMinor: 0 };
        bucket.netMinor += net;
        bucket.taxMinor += tax;
        rateMap.set(rate, bucket);
        continue;
      }

      // One TaxLine per effective rate present in the sale.
      const groups = new Map<number, { netMinor: number; taxMinor: number; grossMinor: number }>();
      for (const line of saleLines) {
        const gross = line.unitPriceMinor * line.quantity;
        if (!gross) continue;
        const rate = vatOff ? 0 : rateOf(line.taxPercent);
        const net = netOf(gross, rate);
        const tax = taxOf(gross, rate);

        const group = groups.get(rate) ?? { netMinor: 0, taxMinor: 0, grossMinor: 0 };
        group.netMinor += net;
        group.taxMinor += tax;
        group.grossMinor += gross;
        groups.set(rate, group);

        const bucket = rateMap.get(rate) ?? { netMinor: 0, taxMinor: 0 };
        bucket.netMinor += net;
        bucket.taxMinor += tax;
        rateMap.set(rate, bucket);

        const category = categoryOf.get(line.itemId ?? "") ?? "General";
        const row = catMap.get(category) ?? { category, netMinor: 0, taxMinor: 0 };
        row.netMinor += net;
        row.taxMinor += tax;
        catMap.set(category, row);
      }
      for (const [rate, g] of groups) {
        if (rate <= 0) continue;
        lines.push({ ref: sale.ticketId, at: sale.paidAt, netMinor: g.netMinor, taxMinor: g.taxMinor, grossMinor: g.grossMinor });
      }
    }

    const purchaseDocs = this.orders
      .list("purchase-invoice")
      .filter((doc) => doc.status !== "cancelled");
    const inputTaxMinor = purchaseDocs.reduce((sum, doc) => {
      // Purchase docs carry no per-line rates; recover VAT at the default rate.
      const rate = vat.ratePercent / 100;
      const net = inclusive
        ? Math.round(doc.totalMinor / (1 + rate))
        : doc.totalMinor;
      return sum + (inclusive ? doc.totalMinor - net : Math.round(net * rate));
    }, 0);

    const byCategory = [...catMap.values()]
      .map((row) => ({ category: row.category, netMinor: row.netMinor, taxMinor: row.taxMinor }))
      .sort((a, b) => b.netMinor - a.netMinor);
    const byRate = [...rateMap.entries()]
      .map(([ratePercent, row]) => ({ ratePercent, netMinor: row.netMinor, taxMinor: row.taxMinor }))
      .sort((a, b) => b.netMinor - a.netMinor);

    const outputTaxMinor = lines.reduce((sum, line) => sum + line.taxMinor, 0);
    return {
      ratePercent: vat.ratePercent,
      inclusive,
      outputTaxMinor,
      inputTaxMinor,
      liabilityMinor: outputTaxMinor - inputTaxMinor,
      lines,
      byCategory,
      byRate,
    };
  }
}
