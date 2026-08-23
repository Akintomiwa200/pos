import { DepartmentPage } from "@/components/DepartmentPage";
import {
  CustomerCreditRulesManager,
  CustomerCreditsManager,
  CustomerGroupsManager,
  CustomerImportManager,
  CustomerListManager,
  GiftBatchesManager,
  GiftCardsManager,
  LoyaltyCardsManager,
  LoyaltyProgramManager,
  LoyaltyRegistrationManager,
  LoyaltyRulesManager,
} from "@/components/setup/customers/CustomerManagers";

export default async function SetupCustomersPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "" || key === "list") return <CustomerListManager />;
  if (key === "groups") return <CustomerGroupsManager />;
  if (key === "credits") return <CustomerCreditsManager />;
  if (key === "credit-rules") return <CustomerCreditRulesManager />;
  if (key === "loyalty/program") return <LoyaltyProgramManager />;
  if (key === "loyalty/rules") return <LoyaltyRulesManager />;
  if (key === "loyalty/registration") return <LoyaltyRegistrationManager />;
  if (key === "loyalty/cards") return <LoyaltyCardsManager />;
  if (key === "gift-cards") return <GiftCardsManager />;
  if (key === "gift-batches") return <GiftBatchesManager />;
  if (key === "import") return <CustomerImportManager />;

  return (
    <DepartmentPage
      kicker="Workspace · Customers"
      title={slug.length ? slug.join(" / ") : "Customers"}
    />
  );
}
