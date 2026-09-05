import { VendorDetailPage } from "@/components/setup/DirectoryDetail";

export default async function SetupVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VendorDetailPage id={id} />;
}