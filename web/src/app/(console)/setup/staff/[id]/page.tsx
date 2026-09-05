import { StaffDetailPage } from "@/components/setup/DirectoryDetail";

export default async function SetupStaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffDetailPage id={id} />;
}