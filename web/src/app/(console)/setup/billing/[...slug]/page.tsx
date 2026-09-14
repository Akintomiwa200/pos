import { DepartmentPage } from "@/components/DepartmentPage";
import { SubscriptionManager } from "@/components/setup/SubscriptionManager";
import { TenantInvoices } from "@/components/setup/TenantInvoices";

const VARIANTS: Record<string, "subscriptions" | "licences" | "invoices"> = {
  subscriptions: "subscriptions",
  licences: "licences",
  licenses: "licences",
  invoices: "invoices",
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
  if (variant === "invoices") return <TenantInvoices />;
  return <SubscriptionManager variant={variant} />;
}
