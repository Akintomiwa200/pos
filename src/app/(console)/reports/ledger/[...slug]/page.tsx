import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  "sales-representative": "Sales Representative",
  staff: "Staff",
};

export default async function LedgerReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Report · Ledger"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Ledger")}
    />
  );
}
