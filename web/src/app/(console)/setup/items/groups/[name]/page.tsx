import { CategoryProductsPage } from "@/components/setup/CategoryProductsPage";

export default async function CategoryProductsRoute({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <CategoryProductsPage slug={decodeURIComponent(name)} />;
}