import { DepartmentPage } from "@/components/DepartmentPage";
import { BinCardPage } from "@/components/reports/stock/BinCardPage";
import { StockBalancePage } from "@/components/reports/stock/StockBalancePage";
import { StockCountPage } from "@/components/reports/stock/StockCountPage";
import { StockExpiryPage } from "@/components/reports/stock/StockExpiryPage";
import { StockMovementPage } from "@/components/reports/stock/StockMovementPage";
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

  return <DepartmentPage kicker="Report · Stock" title={slug.length ? slug.join(" / ") : "Stock"} />;
}