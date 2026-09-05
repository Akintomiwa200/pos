import { ProductDetailsPage } from "@/components/setup/ProductDetailsPage";

export default async function ProductDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailsPage id={decodeURIComponent(id)} />;
}