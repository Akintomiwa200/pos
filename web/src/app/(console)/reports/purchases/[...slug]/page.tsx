import { DepartmentPage } from "@/components/DepartmentPage";
import { PurchaseBreakdownPage } from "@/components/reports/purchases/PurchaseBreakdownPage";
import { PurchaseInventoryPage } from "@/components/reports/purchases/PurchaseInventoryPage";
import { SupplierPerformancePage } from "@/components/reports/purchases/SupplierPerformancePage";

export default async function PurchasesReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "inventory") return <PurchaseInventoryPage />;
  if (key === "breakdown") return <PurchaseBreakdownPage />;
  if (key === "suppliers") return <SupplierPerformancePage />;

  return (
    <DepartmentPage
      kicker="Report · Purchases"
      title={slug.length ? slug.join(" / ") : "Purchases"}
    />
  );
}