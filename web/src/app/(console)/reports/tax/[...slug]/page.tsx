import { DepartmentPage } from "@/components/DepartmentPage";
import { TaxReports, type TaxVariant } from "@/components/reports/TaxReports";

const VARIANTS: Record<string, TaxVariant> = {
  "output-tax": "output-tax",
  "input-tax": "input-tax",
  liability: "liability",
  detail: "detail",
  "by-category": "by-category",
};

export default async function TaxReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const variant = VARIANTS[key];
  if (!variant) {
    return <DepartmentPage kicker="Report · Tax" title={slug.length ? slug.join(" / ") : "Tax"} />;
  }
  return <TaxReports variant={variant} />;
}
