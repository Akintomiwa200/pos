import { DepartmentPage } from "@/components/DepartmentPage";
import { SalesReports } from "@/components/reports/SalesReports";

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "receipt-list") return <SalesReports variant="invoice-list" />;
  return <DepartmentPage kicker="Transaction" title={slug.replace(/-/g, " ")} />;
}
