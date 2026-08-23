import { DepartmentPage } from "@/components/DepartmentPage";
import { GrossProfitReport, type GrossProfitVariant } from "@/components/reports/GrossProfitReport";
import { ItemSalesPage } from "@/components/reports/ItemSalesPage";
import { LeaderboardPage } from "@/components/reports/LeaderboardPage";
import { SalesReports, type SalesReportVariant } from "@/components/reports/SalesReports";
import {
  DocManager,
  SALES_QUOTE_CONFIG,
  SALES_RETURN_CONFIG,
} from "@/components/transactions/DocManager";

const VARIANTS: Record<string, SalesReportVariant> = {
  analytics: "analytics",
  "invoice/list": "invoice-list",
  "invoice/summary": "invoice-summary",
  "invoice/balance": "invoice-balance",
  "invoice/history": "invoice-history",
  "invoice/shift": "invoice-shift",
};

const GP_VARIANTS: Record<string, GrossProfitVariant> = {
  "gross-profit/by-group": "by-group",
  "gross-profit/by-subgroup": "by-subgroup",
  "gross-profit/by-item": "by-item",
};

export default async function SalesReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  const variant = VARIANTS[key];
  if (variant) return <SalesReports variant={variant} />;

  const gp = GP_VARIANTS[key];
  if (gp === "by-item") return <ItemSalesPage />;
  if (gp === "by-subgroup") return <LeaderboardPage />;
  if (gp) return <GrossProfitReport variant={gp} />;

  if (key === "quote/list") return <DocManager config={SALES_QUOTE_CONFIG} mode="list" />;
  if (key === "quote/summary") return <DocManager config={SALES_QUOTE_CONFIG} mode="summary" />;
  if (key === "return/list") return <DocManager config={SALES_RETURN_CONFIG} mode="list" />;
  if (key === "return/summary") return <DocManager config={SALES_RETURN_CONFIG} mode="summary" />;

  return <DepartmentPage kicker="Report · Sales" title={slug.length ? slug.join(" / ") : "Sales"} />;
}
