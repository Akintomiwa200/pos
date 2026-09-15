import type { ReactNode } from "react";
import { ProductionOverviewPage } from "@/components/reports/production/ProductionOverviewPage";
import { ProductionOrdersPage } from "@/components/reports/production/ProductionOrdersPage";
import { ProductionInsightsPage } from "@/components/reports/production/ProductionInsightsPage";
import { ProductionAnalysisPage } from "@/components/reports/production/ProductionAnalysisPage";
import { ProductionCostReportPage } from "@/components/reports/production/ProductionCostReportPage";
import { ProductionBatchCostsPage } from "@/components/reports/production/ProductionBatchCostsPage";
import { ProductionDeviationsPage } from "@/components/reports/production/ProductionDeviationsPage";
import { ProductionWastePage } from "@/components/reports/production/ProductionWastePage";
import { ProductionEfficiencyPage } from "@/components/reports/production/ProductionEfficiencyPage";
import { ProductionLinePerformancePage } from "@/components/reports/production/ProductionLinePerformancePage";
import { ProductionRecipesPage } from "@/components/reports/production/ProductionRecipesPage";
import { ProductionQualityPage } from "@/components/reports/production/ProductionQualityPage";
import { ProductionInventoryUsagePage } from "@/components/reports/production/ProductionInventoryUsagePage";
import { ProductionSchedulePage } from "@/components/reports/production/ProductionSchedulePage";
import { ProductionDowntimePage } from "@/components/reports/production/ProductionDowntimePage";
import { ProductionStaffPage } from "@/components/reports/production/ProductionStaffPage";
import { DepartmentPage } from "@/components/DepartmentPage";

export type ProductionSlugKey =
  | "overview"
  | "orders"
  | "insights"
  | "analysis"
  | "cost-report"
  | "batch-costs"
  | "deviations"
  | "waste"
  | "efficiency"
  | "line-performance"
  | "recipes"
  | "quality"
  | "inventory-usage"
  | "schedule"
  | "downtime"
  | "staff";

const PRODUCTION_PAGES: Record<ProductionSlugKey, ReactNode> = {
  overview: <ProductionOverviewPage />,
  orders: <ProductionOrdersPage />,
  insights: <ProductionInsightsPage />,
  analysis: <ProductionAnalysisPage />,
  "cost-report": <ProductionCostReportPage />,
  "batch-costs": <ProductionBatchCostsPage />,
  deviations: <ProductionDeviationsPage />,
  waste: <ProductionWastePage />,
  efficiency: <ProductionEfficiencyPage />,
  "line-performance": <ProductionLinePerformancePage />,
  recipes: <ProductionRecipesPage />,
  quality: <ProductionQualityPage />,
  "inventory-usage": <ProductionInventoryUsagePage />,
  schedule: <ProductionSchedulePage />,
  downtime: <ProductionDowntimePage />,
  staff: <ProductionStaffPage />,
};

export default async function ProductionReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const page = PRODUCTION_PAGES[key as ProductionSlugKey];
  if (!page || !(key in PRODUCTION_PAGES)) {
    return <DepartmentPage title="Production reports" kicker="Production" />;
  }
  return page;
}