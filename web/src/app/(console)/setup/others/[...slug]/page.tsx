import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  company: "Company",
  branch: "Branch",
  till: "Till",
  store: "Store",
  storefront: "Storefront",
  "payment-gateway": "Payment Gateway",
  tax: "Tax",
  settings: "Settings",
  data: "Data",
  import: "Import",
  export: "Export",
};

export default async function SetupOthersPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Setup · Others"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Others")}
    />
  );
}
