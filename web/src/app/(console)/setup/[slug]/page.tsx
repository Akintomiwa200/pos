import { DepartmentPage } from "@/components/DepartmentPage";
import { DIRECTORY_CONFIGS, DirectoryManager } from "@/components/setup/DirectoryManager";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = DIRECTORY_CONFIGS[slug];
  if (!config) {
    return <DepartmentPage kicker="Setup" title={slug.replace(/-/g, " ")} />;
  }
  return <DirectoryManager config={config} />;
}
