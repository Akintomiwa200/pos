import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  "output-tax": "Output Tax",
  "input-tax": "Input Tax",
  liability: "Liability",
  detail: "Detail",
  "by-category": "By Category",
};

export default async function TaxReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Report · Tax"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Tax")}
    />
  );
}
