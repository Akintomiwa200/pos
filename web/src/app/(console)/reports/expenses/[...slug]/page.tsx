import { DepartmentPage } from "@/components/DepartmentPage";
import { ExpenseMatrixPage } from "@/components/reports/expenses/ExpenseMatrixPage";
import { ExpenseOverviewPage } from "@/components/reports/expenses/ExpenseOverviewPage";
import { RequestsAdvancesPage } from "@/components/reports/expenses/RequestsAdvancesPage";

export default async function ExpensesReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "overview") return <ExpenseOverviewPage />;
  if (key === "matrix") return <ExpenseMatrixPage />;
  if (key === "requests") return <RequestsAdvancesPage />;

  return (
    <DepartmentPage
      kicker="Report · Expenses"
      title={slug.length ? slug.join(" / ") : "Expenses"}
    />
  );
}