import { DepartmentPage } from "@/components/DepartmentPage";
import { EntityTrailFeed } from "@/components/reports/entity/EntityTrailFeed";
import type { EntityKind } from "@/components/reports/entity/shared";

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
  return <EntityTrailFeed entity={entity} />;
}
