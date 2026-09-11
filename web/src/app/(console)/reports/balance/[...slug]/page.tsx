import { DepartmentPage } from "@/components/DepartmentPage";
import { EntityBalanceBoard } from "@/components/reports/entity/EntityBalanceBoard";
import { EntityBalanceDetailPage } from "@/components/reports/entity/EntityBalanceDetailPage";
import type { EntityKind } from "@/components/reports/entity/shared";

const KINDS: Record<string, EntityKind> = {
  customer: "customer",
  vendor: "vendor",
  "sales-representative": "sales-representative",
  staff: "staff",
};

export default async function BalanceReportPage({
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
  const accountId = decodeURIComponent(slug[1] ?? "");
  if (accountId) {
    return <EntityBalanceDetailPage entity={entity} accountId={accountId} />;
  }
  return <EntityBalanceBoard entity={entity} />;
}