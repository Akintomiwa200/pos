import { SubcategoryProductsPage } from "@/components/setup/SubcategoryProductsPage";

export default async function SubcategoryProductsRoute({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <SubcategoryProductsPage slug={decodeURIComponent(name)} />;
}