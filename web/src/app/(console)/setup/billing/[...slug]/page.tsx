import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  subscriptions: "Subscriptions",
};

export default async function SetupBillingPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Setup · Billing"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Billing")}
    />
  );
}
