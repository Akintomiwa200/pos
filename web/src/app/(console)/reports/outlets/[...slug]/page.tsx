import { DepartmentPage } from "@/components/DepartmentPage";
import { BranchSummaryPage } from "@/components/reports/outlets/BranchSummaryPage";
import { OutletComparisonPage } from "@/components/reports/outlets/OutletComparisonPage";
import { SalesByOutletPage } from "@/components/reports/outlets/SalesByOutletPage";
import { StaffByOutletPage } from "@/components/reports/outlets/StaffByOutletPage";
import { StockByOutletPage } from "@/components/reports/outlets/StockByOutletPage";
import { StorePaymentsPage } from "@/components/reports/outlets/StorePaymentsPage";
import { StorePerformancePage } from "@/components/reports/outlets/StorePerformancePage";
import { StoreReturnsPage } from "@/components/reports/outlets/StoreReturnsPage";
import { StoreSalesTrendPage } from "@/components/reports/outlets/StoreSalesTrendPage";
import { StoreTransfersPage } from "@/components/reports/outlets/StoreTransfersPage";
import { StorefrontsPage } from "@/components/reports/outlets/StorefrontsPage";
import { TargetVsActualPage } from "@/components/reports/outlets/TargetVsActualPage";

export default async function OutletsReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "branches") return <BranchSummaryPage />;
  if (key === "stores") return <StorePerformancePage />;
  if (key === "sales") return <SalesByOutletPage />;
  if (key === "trend") return <StoreSalesTrendPage />;
  if (key === "staff") return <StaffByOutletPage />;
  if (key === "targets") return <TargetVsActualPage />;
  if (key === "comparison") return <OutletComparisonPage />;
  if (key === "returns") return <StoreReturnsPage />;
  if (key === "payments") return <StorePaymentsPage />;
  if (key === "stock") return <StockByOutletPage />;
  if (key === "transfers") return <StoreTransfersPage />;
  if (key === "storefronts") return <StorefrontsPage />;

  return (
    <DepartmentPage
      kicker="Report · Outlets"
      title={slug.length ? slug.join(" / ") : "Outlets"}
    />
  );
}