import { api } from "./hq-api";

export type RecipeIngredient = {
  itemId?: string;
  name: string;
  requiredUnits: number;
  actualUnits?: number;
};

export type ProductionRecipe = {
  id: string;
  productId?: string;
  productName: string;
  yieldUnits: number;
  salePriceMinor: number;
  ingredients: RecipeIngredient[];
  updatedAt: string;
};

export type ProductionBatch = {
  id: string;
  number: string;
  productId?: string;
  productName: string;
  plannedUnits: number;
  producedUnits: number;
  status: "planned" | "in-progress" | "completed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  staff?: string;
  line?: string;
  notes?: string;
  unitCostMinor?: number;
};

export type ProductionDeviation = {
  id: string;
  batchId?: string;
  stage: string;
  expectedUnits: number;
  actualUnits: number;
  reason: string;
  severity: "low" | "medium" | "high";
  amountMinor?: number;
  at: string;
  staff?: string;
};

export type ProductionWaste = {
  id: string;
  batchId?: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unitCostMinor: number;
  reason: string;
  at: string;
  staff?: string;
};

export type ProductionBook = {
  batches: ProductionBatch[];
  recipes: ProductionRecipe[];
  deviations: ProductionDeviation[];
  waste: ProductionWaste[];
};

export async function getProductionBook(): Promise<ProductionBook> {
  return api<ProductionBook>("/api/production");
}

export async function listProductionBatches(): Promise<ProductionBatch[]> {
  return api<ProductionBatch[]>("/api/production/batches");
}

export async function saveProductionBatch(body: Partial<ProductionBatch>): Promise<ProductionBatch> {
  return api<ProductionBatch>("/api/production/batches", { method: "POST", body: JSON.stringify(body) });
}

export async function deleteProductionBatch(id: string): Promise<unknown> {
  return api(`/api/production/batches/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listProductionRecipes(): Promise<ProductionRecipe[]> {
  return api<ProductionRecipe[]>("/api/production/recipes");
}

export async function saveProductionRecipe(body: Partial<ProductionRecipe>): Promise<ProductionRecipe> {
  return api<ProductionRecipe>("/api/production/recipes", { method: "POST", body: JSON.stringify(body) });
}

export async function deleteProductionRecipe(id: string): Promise<unknown> {
  return api(`/api/production/recipes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listProductionDeviations(): Promise<ProductionDeviation[]> {
  return api<ProductionDeviation[]>("/api/production/deviations");
}

export async function saveProductionDeviation(body: Partial<ProductionDeviation>): Promise<ProductionDeviation> {
  return api<ProductionDeviation>("/api/production/deviations", { method: "POST", body: JSON.stringify(body) });
}

export async function deleteProductionDeviation(id: string): Promise<unknown> {
  return api(`/api/production/deviations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listProductionWaste(): Promise<ProductionWaste[]> {
  return api<ProductionWaste[]>("/api/production/waste");
}

export async function saveProductionWaste(body: Partial<ProductionWaste>): Promise<ProductionWaste> {
  return api<ProductionWaste>("/api/production/waste", { method: "POST", body: JSON.stringify(body) });
}

export async function deleteProductionWaste(id: string): Promise<unknown> {
  return api(`/api/production/waste/${encodeURIComponent(id)}`, { method: "DELETE" });
}