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

export function emptyBook(): ProductionBook {
  return { batches: [], recipes: [], deviations: [], waste: [] };
}