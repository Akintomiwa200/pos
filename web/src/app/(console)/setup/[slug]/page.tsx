import { redirect } from "next/navigation";
import { DepartmentPage } from "@/components/DepartmentPage";
import { DIRECTORY_CONFIGS } from "@/components/setup/directory-configs";
import { DirectoryManager } from "@/components/setup/DirectoryManager";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "customer") redirect("/setup/customers/list");
  if (slug === "manufacturer") redirect("/setup/items/brands");
  const config = DIRECTORY_CONFIGS[slug];
  if (!config) {
    return <DepartmentPage kicker="Setup" title={slug.replace(/-/g, " ")} />;
  }
  return <DirectoryManager configKey={slug} />;
}
