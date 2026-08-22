import { DepartmentPage } from "@/components/DepartmentPage";
import { EntityReports, type EntityKind } from "@/components/reports/EntityReports";

const KINDS: Record<string, EntityKind> = {
  customer: "customer",
  vendor: "vendor",
  "sales-representative": "sales-representative",
  staff: "staff",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const entity = KINDS[key];
  if (!entity) {
    return (
      <DepartmentPage
        kicker="Report"
        title={slug.length ? slug.join(" / ") : "Report"}
      />
    );
  }
  return <EntityReports report="ledger" entity={entity} />;
}
