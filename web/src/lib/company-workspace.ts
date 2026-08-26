export function companyPath(companyId: string, section = "") {
  const id = companyId.trim() || "current";
  return section ? `/admin/companies/${id}/${section}` : `/admin/companies/${id}`;
}

export type CompanySection = {
  id: string;
  label: string;
};

/** In-company workspace — not Super Admin daily sidebar items. */
export const COMPANY_SECTIONS: CompanySection[] = [
  { id: "", label: "Overview" },
  { id: "profile", label: "Business information" },
  { id: "owners", label: "Owners" },
  { id: "branches", label: "Branches" },
  { id: "stores", label: "Stores" },
  { id: "storefronts", label: "Storefronts" },
  { id: "tills", label: "Tills / POS" },
  { id: "staff", label: "Staff" },
  { id: "customers", label: "Customers" },
  { id: "suppliers", label: "Suppliers" },
  { id: "products", label: "Products" },
  { id: "inventory", label: "Inventory" },
  { id: "sales", label: "Sales" },
  { id: "purchases", label: "Purchases" },
  { id: "expenses", label: "Expenses" },
  { id: "reports", label: "Reports" },
  { id: "subscription", label: "Subscription" },
  { id: "billing", label: "Billing" },
  { id: "payments", label: "Payments" },
  { id: "activity", label: "Activity logs" },
  { id: "settings", label: "Settings" },
  { id: "verification", label: "Verification" },
  { id: "documents", label: "Documents" },
];

export const COMPANY_LIST_STATUSES = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "trial", label: "Trial" },
  { id: "expired", label: "Expired" },
] as const;

export type CompanyListStatus = (typeof COMPANY_LIST_STATUSES)[number]["id"];

/** Old Super Admin URLs that now live inside a company workspace. */
export const LEGACY_COMPANY_ROUTES: Record<string, string> = {
  profile: "profile",
  branches: "branches",
  stores: "stores",
  storefronts: "storefronts",
  owners: "owners",
  gateways: "payments",
  taxes: "billing",
};
