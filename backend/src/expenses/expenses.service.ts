import { Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Expense } from "./expenses.types";

@Injectable()
export class ExpensesService {
  private rows: Expense[] = [];
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "expenses.json");

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Expense[];
      if (Array.isArray(parsed)) this.rows = parsed;
    } catch {
      this.rows = [];
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.rows, null, 2), "utf8");
  }

  list(account?: string): Expense[] {
    return account ? this.rows.filter((row) => row.account === account) : this.rows;
  }

  async save(input: Partial<Expense>): Promise<Expense> {
    const existing = input.id ? this.rows.find((row) => row.id === input.id) : undefined;
    if (!input.description?.trim() && !existing) throw new NotFoundException("Description is required");
    const amountMinor = Math.round(input.amountMinor ?? existing?.amountMinor ?? 0);
    if (amountMinor <= 0) throw new NotFoundException("Amount must be greater than zero");
    const next: Expense = {
      id: existing?.id ?? `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: existing?.at ?? (input.at || new Date().toISOString()),
      account: input.account?.trim() ?? existing?.account ?? "General",
      description: input.description?.trim() ?? existing?.description ?? "",
      amountMinor,
      method: input.method?.trim() ?? existing?.method ?? "cash",
      staff: input.staff?.trim() ?? existing?.staff,
    };
    this.rows = existing
      ? this.rows.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.rows];
    await this.persist();
    return next;
  }

  async delete(id: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => row.id !== id);
    if (this.rows.length === before) throw new NotFoundException("Expense not found");
    await this.persist();
  }
}
