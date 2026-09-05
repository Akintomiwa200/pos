import { SalesRepDetailPage } from "@/components/setup/DirectoryDetail";

export default async function SetupSalesRepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SalesRepDetailPage id={id} />;
}