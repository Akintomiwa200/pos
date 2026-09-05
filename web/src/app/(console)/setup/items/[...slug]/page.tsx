import { redirect } from "next/navigation";
import { DepartmentPage } from "@/components/DepartmentPage";
import { ItemsManager } from "@/components/setup/ItemsManager";
import { CategoriesManager } from "@/components/setup/CategoriesManager";
import { SubcategoriesManager } from "@/components/setup/SubcategoriesManager";
import { UnitsManager } from "@/components/setup/UnitsManager";
import { PacksManager } from "@/components/setup/PacksManager";
import { BarcodeLabelsManager } from "@/components/setup/BarcodeLabelsManager";
import {
  BrandsManager,
  ExpiringManager,
  LowStockManager,
  PriceListManager,
  ProductExportManager,
  ProductImportManager,
} from "@/components/setup/ProductManagers";

const TITLES: Record<string, string> = {
  items: "All Products",
  groups: "Categories",
  subgroups: "Subcategories",
  units: "Units of Measure",
  packs: "Pack & Cartons",
  brands: "Brands",
  prices: "Price List",
  "low-stock": "Low Stock",
  expiring: "Expiring Products",
  barcode: "Print Labels",
  import: "Import Products",
  export: "Export Products",
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
  if (key === "packs") return <PacksManager />;
  if (key === "brands") return <BrandsManager />;
  if (key === "prices") return <PriceListManager />;
  if (key === "low-stock") return <LowStockManager />;
  if (key === "expiring") return <ExpiringManager />;
  if (key === "barcode") return <BarcodeLabelsManager />;
  if (key === "import") return <ProductImportManager />;
  if (key === "export") return <ProductExportManager />;

  return (
    <DepartmentPage
      kicker="Main Menu · Products"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Products")}
    />
  );
}
