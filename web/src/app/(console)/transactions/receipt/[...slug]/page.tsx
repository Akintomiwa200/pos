import { DepartmentPage } from "@/components/DepartmentPage";
import { SalesReports } from "@/components/reports/SalesReports";
import { ReceiptAnalysis } from "@/components/transactions/ReceiptAnalysis";

export default async function ReceiptTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "" || key === "list") return <SalesReports variant="invoice-list" />;
  if (key === "analysis") return <ReceiptAnalysis />;

  return (
    <DepartmentPage
      kicker="Transaction · Receipt"
      title={slug.length ? slug.join(" / ") : "Receipt"}
    />
  );
}
