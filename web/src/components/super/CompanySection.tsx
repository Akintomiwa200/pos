"use client";

import Link from "next/link";
import { COMPANY_SECTIONS, companyPath } from "@/lib/company-workspace";
import { useLivePos } from "@/lib/live-pos";
import { CompanyManager } from "@/components/setup/CompanyManager";
import { BranchManager } from "@/components/setup/BranchManager";
import { StoreManager } from "@/components/setup/StoreManager";
import { StorefrontManager } from "@/components/setup/StorefrontManager";
import { TillManager } from "@/components/TillManager";
import { SubscriptionManager } from "@/components/setup/SubscriptionManager";
import { GatewayManager } from "@/components/setup/GatewayManager";
import { TaxManager } from "@/components/setup/TaxManager";
import { ItemsManager } from "@/components/setup/ItemsManager";
import { CustomerListManager } from "@/components/setup/customers/CustomerManagers";
import { AccountManager } from "@/components/AccountManager";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

export function CompanySection({
  companyId,
  section,
}: {
  companyId: string;
  section: string;
}) {
  if (section === "profile") return <CompanyManager />;
  if (section === "branches") return <BranchManager />;
  if (section === "stores") return <StoreManager />;
  if (section === "storefronts") return <StorefrontManager />;
  if (section === "tills") return <TillManager />;
  if (section === "owners") {
    return (
      <AccountManager
        scope="tenant"
        kicker="Company · People"
        title="Owners"
        copy="Administrators of this company. They sign into company HQ."
      />
    );
  }
  if (section === "staff") {
    return (
      <AccountManager
        scope="tenant"
        kicker="Company · People"
        title="Staff"
        copy="People assigned to this company — cashiers, managers, accountants."
      />
    );
  }
  if (section === "customers") return <CustomerListManager />;
  if (section === "products" || section === "inventory") return <ItemsManager />;
  if (section === "subscription") return <SubscriptionManager variant="subscriptions" />;
  if (section === "payments") return <GatewayManager />;
  if (section === "billing") return <TaxManager />;
  if (!section) return <CompanyOverview companyId={companyId} />;

  const meta = COMPANY_SECTIONS.find((row) => row.id === section);
  return (
    <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
      <h2 className="text-[16px] font-semibold">{meta?.label ?? section}</h2>
      <p className="mt-2 text-sm text-pos-ink-muted">
        This company record is scoped to the organisation — not the Super Admin daily sidebar.
        Live data for this area will attach here as the tenant APIs land.
      </p>
    </div>
  );
}

function CompanyOverview({ companyId }: { companyId: string }) {
  const { company, stores, branches, tills, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  if (!company) return null;
  const id = companyId === "current" ? company.id : companyId;

  return (
    <div>
      <SetupHeader
        kicker="Company workspace"
        title="Overview"
        copy="Everything for this tenant. Super Admin daily navigation stays at platform level — this workspace is the company."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Stores" value={String(stores.length)} />
        <SetupStat label="Branches" value={String(branches.length)} />
        <SetupStat label="Tills" value={String(tills.length)} tone="accent" />
        <SetupStat label="Currency" value={company.currency || "NGN"} />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {COMPANY_SECTIONS.filter((row) => row.id).map((row) => (
          <li key={row.id}>
            <Link
              href={companyPath(id, row.id)}
              className="block rounded-[16px] border border-pos-border bg-pos-surface px-4 py-3 text-sm font-medium hover:border-pos-primary/30"
            >
              {row.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
