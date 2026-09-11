import { DepartmentPage } from "@/components/DepartmentPage";
import { CustomerLedgerPage } from "@/components/reports/ledger/CustomerLedgerPage";
import { SalesRepLedgerPage } from "@/components/reports/ledger/SalesRepLedgerPage";
import { StaffLedgerPage } from "@/components/reports/ledger/StaffLedgerPage";
import { VendorLedgerPage } from "@/components/reports/ledger/VendorLedgerPage";
import type { EntityKind } from "@/components/reports/entity/shared";

const KINDS: Record<string, EntityKind> = {
  customer: "customer",
  vendor: "vendor",
  "sales-representative": "sales-representative",
  staff: "staff",
};

export default async function LedgerReportPage({
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
  if (entity === "customer") return <CustomerLedgerPage />;
  if (entity === "vendor") return <VendorLedgerPage />;
  if (entity === "sales-representative") return <SalesRepLedgerPage />;
  return <StaffLedgerPage />;
}