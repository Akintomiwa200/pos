import { DepartmentPage } from "@/components/DepartmentPage";
import { SubscriptionManager } from "@/components/setup/SubscriptionManager";

const VARIANTS: Record<string, "subscriptions" | "licences"> = {
  subscriptions: "subscriptions",
  licences: "licences",
  licenses: "licences",
};

export default async function BillingPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const variant = VARIANTS[key];
  if (!variant) {
    return (
      <DepartmentPage
        kicker="Account · Billing"
        title={slug.length ? slug.join(" / ") : "Billing"}
      />
    );
  }
  return <SubscriptionManager variant={variant} />;
}
