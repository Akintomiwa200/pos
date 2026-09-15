import { DepartmentPage } from "@/components/DepartmentPage";
import { CashForecastPage } from "@/components/reports/money/CashForecastPage";
import { ReceivablesAgingPage } from "@/components/reports/money/ReceivablesAgingPage";
import { PayablesAgingPage } from "@/components/reports/money/PayablesAgingPage";
import { CustomerAdvancesPage } from "@/components/reports/money/CustomerAdvancesPage";
import { FixedAssetsPage } from "@/components/reports/money/FixedAssetsPage";
import { PrepaidPage } from "@/components/reports/money/PrepaidPage";

export default async function MoneyReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "cash-forecast") return <CashForecastPage />;
  if (key === "receivables-aging") return <ReceivablesAgingPage />;
  if (key === "payables-aging") return <PayablesAgingPage />;
  if (key === "customer-advances") return <CustomerAdvancesPage />;
  if (key === "fixed-assets") return <FixedAssetsPage />;
  if (key === "prepaid") return <PrepaidPage />;

  return (
    <DepartmentPage
      kicker="Report · Money"
      title={slug.length ? slug.join(" / ") : "Money"}
    />
  );
}