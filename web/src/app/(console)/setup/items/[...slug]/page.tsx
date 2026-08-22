import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  items: "All Products",
  subgroups: "Sub Category",
  groups: "Categories",
  units: "Units",
};

export default async function SetupItemsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Products"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "All Products")}
    />
  );
}
