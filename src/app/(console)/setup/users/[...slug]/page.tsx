import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  account: "Account",
  group: "Group",
};

export default async function SetupUsersPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Setup · Users"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Users")}
    />
  );
}
