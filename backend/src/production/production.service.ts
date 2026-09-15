import { Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  emptyBook,
  type ProductionBatch,
  type ProductionBook,
  type ProductionDeviation,
  type ProductionRecipe,
  type ProductionWaste,
} from "./production.types";

@Injectable()
export class ProductionService {
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "production.json");
  private book: ProductionBook = emptyBook();

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Partial<ProductionBook>;
      this.book = {
        batches: Array.isArray(parsed.batches) ? parsed.batches : [],
        recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
        deviations: Array.isArray(parsed.deviations) ? parsed.deviations : [],
        waste: Array.isArray(parsed.waste) ? parsed.waste : [],
      };
    } catch {
      this.book = emptyBook();
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.book, null, 2), "utf8");
  }

  snapshot(): ProductionBook {
    return this.book;
  }

  listBatches(): ProductionBatch[] {
    return this.book.batches;
  }

  async saveBatch(input: Partial<ProductionBatch>): Promise<ProductionBatch> {
    const existing = input.id ? this.book.batches.find((row) => row.id === input.id) : undefined;
    if (!input.productName?.trim() && !existing) throw new NotFoundException("Product name is required");
    const producedUnits = Math.round(input.producedUnits ?? existing?.producedUnits ?? input.plannedUnits ?? 0);
    const plannedUnits = Math.round(input.plannedUnits ?? existing?.plannedUnits ?? 1);
    const status =
      (input.status ?? existing?.status) ??
      (producedUnits > 0 ? "completed" : "planned");
    const next: ProductionBatch = {
      id: existing?.id ?? `pb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      number:
        existing?.number ??
        `BN-${new Date().getFullYear()}-${String(this.book.batches.length + 1).padStart(3, "0")}`,
      productId: input.productId ?? existing?.productId,
      productName: input.productName?.trim() ?? existing?.productName ?? "",
      plannedUnits: Math.max(1, plannedUnits),
      producedUnits: Math.max(0, producedUnits),
      status,
      startedAt: existing?.startedAt ?? input.startedAt ?? new Date().toISOString(),
      completedAt: input.completedAt ?? existing?.completedAt,
      staff: input.staff?.trim() ?? existing?.staff,
      line: input.line?.trim() ?? existing?.line,
      notes: input.notes?.trim() ?? existing?.notes,
      unitCostMinor: existing?.unitCostMinor ?? input.unitCostMinor ?? 0,
    };
    this.book.batches = existing
      ? this.book.batches.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.batches];
    await this.persist();
    return next;
  }

  async deleteBatch(id: string) {
    const before = this.book.batches.length;
    this.book.batches = this.book.batches.filter((row) => row.id !== id);
    if (this.book.batches.length === before) throw new NotFoundException("Batch not found");
    await this.persist();
  }

  listRecipes(): ProductionRecipe[] {
    return this.book.recipes;
  }

  async saveRecipe(input: Partial<ProductionRecipe>): Promise<ProductionRecipe> {
    const existing = input.id ? this.book.recipes.find((row) => row.id === input.id) : undefined;
    if (!input.productName?.trim() && !existing) throw new NotFoundException("Product name is required");
    const next: ProductionRecipe = {
      id: existing?.id ?? `pr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: input.productId ?? existing?.productId,
      productName: input.productName?.trim() ?? existing?.productName ?? "",
      yieldUnits: Math.max(1, Math.round(input.yieldUnits ?? existing?.yieldUnits ?? 1)),
      salePriceMinor: Math.round(input.salePriceMinor ?? existing?.salePriceMinor ?? 0),
      ingredients: Array.isArray(input.ingredients)
        ? input.ingredients
        : existing?.ingredients ?? [],
      updatedAt: new Date().toISOString(),
    };
    this.book.recipes = existing
      ? this.book.recipes.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.recipes];
    await this.persist();
    return next;
  }

  async deleteRecipe(id: string) {
    const before = this.book.recipes.length;
    this.book.recipes = this.book.recipes.filter((row) => row.id !== id);
    if (this.book.recipes.length === before) throw new NotFoundException("Recipe not found");
    await this.persist();
  }

  listDeviations(): ProductionDeviation[] {
    return this.book.deviations;
  }

  async saveDeviation(input: Partial<ProductionDeviation>): Promise<ProductionDeviation> {
    const existing = input.id ? this.book.deviations.find((row) => row.id === input.id) : undefined;
    if (!input.reason?.trim() && !existing) throw new NotFoundException("Deviation reason is required");
    const next: ProductionDeviation = {
      id: existing?.id ?? `dv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      batchId: input.batchId ?? existing?.batchId,
      stage: input.stage?.trim() ?? existing?.stage ?? "General",
      expectedUnits: Number(input.expectedUnits ?? existing?.expectedUnits ?? 0),
      actualUnits: Number(input.actualUnits ?? existing?.actualUnits ?? 0),
      reason: input.reason?.trim() ?? existing?.reason ?? "",
      severity:
        input.severity === "low" || input.severity === "medium" || input.severity === "high"
          ? input.severity
          : existing?.severity ?? "medium",
      amountMinor: Math.round(
        input.amountMinor ?? existing?.amountMinor ?? 0,
      ),
      at: existing?.at ?? input.at ?? new Date().toISOString(),
      staff: input.staff?.trim() ?? existing?.staff,
    };
    this.book.deviations = existing
      ? this.book.deviations.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.deviations];
    await this.persist();
    return next;
  }

  async deleteDeviation(id: string) {
    const before = this.book.deviations.length;
    this.book.deviations = this.book.deviations.filter((row) => row.id !== id);
    if (this.book.deviations.length === before) throw new NotFoundException("Deviation not found");
    await this.persist();
  }

  listWaste(): ProductionWaste[] {
    return this.book.waste;
  }

  async saveWaste(input: Partial<ProductionWaste>): Promise<ProductionWaste> {
    const existing = input.id ? this.book.waste.find((row) => row.id === input.id) : undefined;
    if (!input.itemName?.trim() && !existing) throw new NotFoundException("Waste item name is required");
    const next: ProductionWaste = {
      id: existing?.id ?? `pw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      batchId: input.batchId ?? existing?.batchId,
      itemId: input.itemId ?? existing?.itemId,
      itemName: input.itemName?.trim() ?? existing?.itemName ?? "",
      quantity: Number(input.quantity ?? existing?.quantity ?? 0),
      unitCostMinor: Math.round(input.unitCostMinor ?? existing?.unitCostMinor ?? 0),
      reason: input.reason?.trim() ?? existing?.reason ?? "Wastage",
      at: existing?.at ?? input.at ?? new Date().toISOString(),
      staff: input.staff?.trim() ?? existing?.staff,
    };
    this.book.waste = existing
      ? this.book.waste.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.waste];
    await this.persist();
    return next;
  }

  async deleteWaste(id: string) {
    const before = this.book.waste.length;
    this.book.waste = this.book.waste.filter((row) => row.id !== id);
    if (this.book.waste.length === before) throw new NotFoundException("Waste entry not found");
    await this.persist();
  }
}