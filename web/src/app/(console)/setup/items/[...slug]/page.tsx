import { DepartmentPage } from "@/components/DepartmentPage";
import { ItemsManager } from "@/components/setup/ItemsManager";
import { CategoriesManager } from "@/components/setup/CategoriesManager";
import { SubcategoriesManager } from "@/components/setup/SubcategoriesManager";
import { UnitsManager } from "@/components/setup/UnitsManager";

const TITLES: Record<string, string> = {
  items: "All Products",
  groups: "Categories",
  subgroups: "Subcategories",
  units: "Units of Measure",
  packs: "Pack & Cartons",
};

export default async function SetupItemsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "" || key === "items") return <ItemsManager />;
  if (key === "groups") return <CategoriesManager />;
  if (key === "subgroups") return <SubcategoriesManager />;
  if (key === "units") return <UnitsManager />;
  if (key === "packs") return <UnitsManager kindFilter="composite" />;

  return (
    <DepartmentPage
      kicker="Setup · Products"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Products")}
    />
  );
}
