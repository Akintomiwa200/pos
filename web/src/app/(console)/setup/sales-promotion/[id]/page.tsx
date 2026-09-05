import { PromotionDetailPage } from "@/components/setup/DirectoryDetail";

export default async function SetupSalesPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PromotionDetailPage id={id} />;
}