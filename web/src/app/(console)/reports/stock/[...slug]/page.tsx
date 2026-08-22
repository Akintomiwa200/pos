import { DepartmentPage } from "@/components/DepartmentPage";
import { StockReports, type StockVariant } from "@/components/reports/StockReports";

const VARIANTS: Record<string, StockVariant> = {
  balance: "balance",
  sheet: "sheet",
  movement: "movement",
  "bin-card": "bin-card",
  expiry: "expiry",
  count: "count",
};

export default async function StockReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const variant = VARIANTS[key];
  if (!variant) {
    return <DepartmentPage kicker="Report · Stock" title={slug.length ? slug.join(" / ") : "Stock"} />;
  }
  return <StockReports variant={variant} />;
}
