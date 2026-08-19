import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  list: "List",
  summary: "Summary",
};

export default async function ExpensesTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Transaction · Expenses"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Expenses")}
    />
  );
}
