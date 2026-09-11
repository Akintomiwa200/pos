import { DepartmentPage } from "@/components/DepartmentPage";
import { InputTaxPage } from "@/components/reports/tax/InputTaxPage";
import { OutputTaxPage } from "@/components/reports/tax/OutputTaxPage";
import { TaxByCategoryPage } from "@/components/reports/tax/TaxByCategoryPage";
import { TaxDetailPage } from "@/components/reports/tax/TaxDetailPage";
import { TaxLiabilityPage } from "@/components/reports/tax/TaxLiabilityPage";

export default async function TaxReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "output-tax") return <OutputTaxPage />;
  if (key === "input-tax") return <InputTaxPage />;
  if (key === "liability") return <TaxLiabilityPage />;
  if (key === "detail") return <TaxDetailPage />;
  if (key === "by-category") return <TaxByCategoryPage />;

  return <DepartmentPage kicker="Report · Tax" title={slug.length ? slug.join(" / ") : "Tax"} />;
}