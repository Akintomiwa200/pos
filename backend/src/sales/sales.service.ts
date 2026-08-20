import { Injectable, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ConsoleService } from "../console/console.service";

export type StoredSale = {
  ticketId: string;
  paidAt: string;
  tender: string;
  cashierName: string;
  totalMinor: number;
  loyaltyNumber?: string | null;
  lines: Array<{
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    image: string;
  }>;
  receiptText?: string;
};

@Injectable()
export class SalesService implements OnModuleInit {
  private sales: StoredSale[] = [];
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "sales.json");
  private readonly receiptsDir = join(this.dir, "receipts");

  constructor(private readonly consoleService: ConsoleService) {}

  async onModuleInit() {
    await mkdir(this.receiptsDir, { recursive: true });
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as StoredSale[];
      if (Array.isArray(parsed)) this.sales = parsed;
    } catch {
      this.sales = [];
    }
  }

  list() {
    return this.sales;
  }

  get(ticketId: string) {
    return this.sales.find((sale) => sale.ticketId === ticketId) ?? null;
  }

  async record(sale: StoredSale) {
    const next = {
      ...sale,
      paidAt: sale.paidAt || new Date().toISOString(),
    };
    this.sales = [next, ...this.sales.filter((row) => row.ticketId !== next.ticketId)];
    await mkdir(this.receiptsDir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.sales, null, 2), "utf8");
    if (next.receiptText) {
      await writeFile(
        join(this.receiptsDir, `${next.ticketId}.txt`),
        next.receiptText.replace(/\n/g, "\r\n"),
        "utf8",
      );
    }
    await this.consoleService.notifySale(next);
    return next;
  }
}
