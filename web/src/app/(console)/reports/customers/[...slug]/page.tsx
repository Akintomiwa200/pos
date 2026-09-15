import { DepartmentPage } from "@/components/DepartmentPage";
import { TopCustomersPage } from "@/components/reports/customers/TopCustomersPage";
import { DormantCustomersPage } from "@/components/reports/customers/DormantCustomersPage";
import { CreditControlPage } from "@/components/reports/customers/CreditControlPage";

export default async function CustomersReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "top") return <TopCustomersPage />;
  if (key === "dormant") return <DormantCustomersPage />;
  if (key === "credit-control") return <CreditControlPage />;

  return (
    <DepartmentPage
      kicker="Report · Entities"
      title={slug.length ? slug.join(" / ") : "Customers"}
    />
  );
}