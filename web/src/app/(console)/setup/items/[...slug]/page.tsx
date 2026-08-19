import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  items: "Items",
  subgroups: "Subgroups",
  groups: "Groups",
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
      kicker="Setup · Items"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Items")}
    />
  );
}
