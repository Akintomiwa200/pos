import { DepartmentPage } from "@/components/DepartmentPage";
import { ExpensesManager } from "@/components/transactions/ExpensesManager";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  if (key === "summary") return <ExpensesManager summaryOnly />;
  if (key === "" || key === "list") return <ExpensesManager />;
  return (
    <DepartmentPage
      kicker="Transaction · Expenses"
      title={slug.length ? slug.join(" / ") : "Expenses"}
    />
  );
}
