"use client";

import { createContext, useContext, type ReactNode } from "react";

export type OrgLinks = {
  area: "tenant" | "producer";
  company: string;
  branch: string;
  store: string;
  till: string;
  storefront: string;
  gateway: string;
  tax: string;
};

export const DEFAULT_ORG_LINKS: OrgLinks = {
  area: "tenant",
  company: "/setup/others/company",
  branch: "/setup/others/branch",
  store: "/setup/others/store",
  till: "/setup/others/till",
  storefront: "/setup/others/storefront",
  gateway: "/setup/others/payment-gateway",
  tax: "/setup/others/tax",
};

export const ADMIN_ORG_LINKS: OrgLinks = {
  area: "producer",
  company: "/admin/companies/current/profile",
  branch: "/admin/branches",
  store: "/admin/stores",
  till: "/admin/tills",
  storefront: "/admin/storefronts",
  gateway: "/admin/commerce/gateways",
  tax: "/admin/billing/plans",
};

export function adminOrgLinksForCompany(companyId: string): OrgLinks {
  const id = companyId.trim() || "current";
  return {
    area: "producer",
    company: `/admin/companies/${id}/profile`,
    branch: `/admin/companies/${id}/branches`,
    store: `/admin/companies/${id}/stores`,
    till: `/admin/companies/${id}/tills`,
    storefront: `/admin/companies/${id}/storefronts`,
    gateway: `/admin/companies/${id}/payments`,
    tax: `/admin/companies/${id}/billing`,
  };
}

const OrgLinksContext = createContext<OrgLinks>(DEFAULT_ORG_LINKS);

export function OrgLinksProvider({
  value,
  children,
}: {
  value: OrgLinks;
  children: ReactNode;
}) {
  return <OrgLinksContext.Provider value={value}>{children}</OrgLinksContext.Provider>;
}

export function useOrgLinks() {
  return useContext(OrgLinksContext);
}
