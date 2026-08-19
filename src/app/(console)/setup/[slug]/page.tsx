import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  "sales-representative": "Sales Representative",
  staff: "Staff",
  manufacturer: "Manufacturer",
  "payment-method": "Payment Method",
  "sales-promotion": "Sales Promotion",
  "expense-account": "Expense Account",
};

export default async function SetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <DepartmentPage
      kicker="Setup"
      title={TITLES[slug] ?? slug.replace(/-/g, " ")}
    />
  );
}
