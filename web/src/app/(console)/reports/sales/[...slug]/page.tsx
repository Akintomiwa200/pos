import { DepartmentPage } from "@/components/DepartmentPage";
import { GrossProfitReport, type GrossProfitVariant } from "@/components/reports/GrossProfitReport";
import { ItemSalesPage } from "@/components/reports/ItemSalesPage";
import { LeaderboardPage } from "@/components/reports/LeaderboardPage";
import { InvoiceBalancePage } from "@/components/reports/sales/InvoiceBalancePage";
import { InvoiceHistoryPage } from "@/components/reports/sales/InvoiceHistoryPage";
import { InvoiceListPage } from "@/components/reports/sales/InvoiceListPage";
import { InvoiceSummaryPage } from "@/components/reports/sales/InvoiceSummaryPage";
import { SalesAnalyticsPage } from "@/components/reports/sales/SalesAnalyticsPage";
import { ShiftReportPage } from "@/components/reports/sales/ShiftReportPage";
import {
  DocManager,
  SALES_QUOTE_CONFIG,
  SALES_RETURN_CONFIG,
} from "@/components/transactions/DocManager";

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

  if (key === "analytics") return <SalesAnalyticsPage />;
  if (key === "invoice/list") return <InvoiceListPage />;
  if (key === "invoice/summary") return <InvoiceSummaryPage />;
  if (key === "invoice/balance") return <InvoiceBalancePage />;
  if (key === "invoice/history") return <InvoiceHistoryPage />;
  if (key === "invoice/shift") return <ShiftReportPage />;

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