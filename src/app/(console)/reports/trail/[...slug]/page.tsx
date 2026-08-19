import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  "sales-representative": "Sales Representative",
};

export default async function TrailReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Report · Trail"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Trail")}
    />
  );
}
