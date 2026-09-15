import { DepartmentPage } from "@/components/DepartmentPage";
import { AwaitingPickupPage } from "@/components/reports/stock/AwaitingPickupPage";
import { BinCardPage } from "@/components/reports/stock/BinCardPage";
import { LowStockPage } from "@/components/reports/stock/LowStockPage";
import { OnHandPage } from "@/components/reports/stock/OnHandPage";
import { ReplenishmentPage } from "@/components/reports/stock/ReplenishmentPage";
import { StockAnalysisPage } from "@/components/reports/stock/StockAnalysisPage";
import { StockBalancePage } from "@/components/reports/stock/StockBalancePage";
import { StockCountPage } from "@/components/reports/stock/StockCountPage";
import { StockExpiryPage } from "@/components/reports/stock/StockExpiryPage";
import { StockMovementPage } from "@/components/reports/stock/StockMovementPage";
import { StockPerformancePage } from "@/components/reports/stock/StockPerformancePage";
import { StockSheetPage } from "@/components/reports/stock/StockSheetPage";

export default async function StockReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "balance") return <StockBalancePage />;
  if (key === "sheet") return <StockSheetPage />;
  if (key === "movement") return <StockMovementPage />;
  if (key === "bin-card") return <BinCardPage />;
  if (key === "expiry") return <StockExpiryPage />;
  if (key === "count") return <StockCountPage />;
  if (key === "on-hand") return <OnHandPage />;
  if (key === "low") return <LowStockPage />;
  if (key === "replenishment") return <ReplenishmentPage />;
  if (key === "performance") return <StockPerformancePage />;
  if (key === "analysis") return <StockAnalysisPage />;
  if (key === "awaiting-pickup") return <AwaitingPickupPage />;

  return <DepartmentPage kicker="Report · Stock" title={slug.length ? slug.join(" / ") : "Stock"} />;
}