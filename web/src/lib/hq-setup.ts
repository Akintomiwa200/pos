import { api } from "./hq-api";

export type HqCompany = {
  id: string;
  name: string;
  legalName: string;
  rc: string;
  tin: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  country: string;
  currency: string;
};

export type HqBranch = {
  id: string;
  companyId: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  manager: string;
  active: boolean;
};

export type HqStore = {
  id: string;
  branchId: string;
  name: string;
  kind: "retail" | "warehouse" | "dark-kitchen";
  address: string;
  active: boolean;
};

export type HqStorefront = {
  id: string;
  storeId: string;
  name: string;
  url: string;
  hours: string;
  enabled: boolean;
  syncPrices: boolean;
  syncStock: boolean;
};

export type HqGateway = {
  id: string;
  name: string;
  provider: "paystack" | "flutterwave" | "moniepoint" | "bank" | "cash" | "card";
  enabled: boolean;
  isDefault: boolean;
  publicKey: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
};

export type HqTax = {
  id: string;
  name: string;
  ratePercent: number;
  inclusive: boolean;
  compound: boolean;
  active: boolean;
  isDefault: boolean;
};

export type HqOrgSettings = {
  timezone: string;
  language: string;
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  receiptPaper: "80mm" | "58mm";
  receiptTemplate: "classic" | "compact" | "bold" | "minimal";
  receiptBrandColor: string;
  receiptShowLogo: boolean;
  receiptShowTax: boolean;
  receiptShowCashier: boolean;
  receiptShowBarcode: boolean;
  receiptTitle: string;
  receiptAddress: string;
  receiptEmail: string;
  receiptBarcodeValue: string;
  receiptShowPoweredBy: boolean;
  receiptShowTicketNumber: boolean;
  receiptShowDate: boolean;
  receiptShowCustomer: boolean;
  receiptShowCustomerPhone: boolean;
  receiptShowTill: boolean;
  receiptShowTender: boolean;
  receiptShowChange: boolean;
  receiptShowLoyalty: boolean;
  receiptShowLoyaltyBalance: boolean;
  receiptShowLoyaltyRedeemed: boolean;
  receiptShowLoyaltyEarned: boolean;
  receiptShowGiftCard: boolean;
  receiptShowGiftCardBalance: boolean;
  receiptShowTitle: boolean;
  receiptShowAddress: boolean;
  receiptShowEmail: boolean;
  receiptShowPhone: boolean;
  receiptShowHeader: boolean;
  receiptShowFooter: boolean;
  receiptShowDiscount: boolean;
  invoicePrefix: string;
  invoiceNextNumber: number;
  invoiceTemplate: "modern" | "letterhead" | "classic" | "sapphire" | "ivory";
  invoiceBrandColor: string;
  invoicePanelColor: string;
  invoiceShowLogo: boolean;
  invoiceTerms: string;
  invoicePaymentNote: string;
  pricesIncludeVat: boolean;
  idleLockMinutes: number;
  requireOpenShift: boolean;
  lowStockQty: number;
  blockNegativeStock: boolean;
  printDuplicateReceipt: boolean;
  showSkuOnReceipt: boolean;
  allowPriceOverride: boolean;
  requireManagerPin: boolean;
  allowDiscounts: boolean;
  maxDiscountPercent: number;
  allowPartialRefunds: boolean;
  restockOnRefund: boolean;
  refundWithoutTicket: boolean;
  tipsEnabled: boolean;
  holdExpiryMinutes: number;
  autoPrintReceipt: boolean;
  openCashDrawer: boolean;
  receiptCopies: number;
  notifyLowStock: boolean;
  notifyNewSale: boolean;
  notifyRefund: boolean;
  notifyShiftClose: boolean;
  notifyDailySummary: boolean;
  passwordMinLength: number;
  sessionTimeoutMinutes: number;
  uiTheme: "system" | "light" | "dark";
  uiFont:
    | "inter"
    | "dm-sans"
    | "source-sans"
    | "ibm-plex"
    | "nunito"
    | "outfit"
    | "manrope"
    | "space-grotesk";
  uiAccent: "violet" | "teal" | "blue" | "amber" | "rose";
  uiDensity: "comfortable" | "compact";
  uiReduceMotion: boolean;
};

export type HqOrgSnapshot = {
  company: HqCompany;
  branches: HqBranch[];
  stores: HqStore[];
  storefronts: HqStorefront[];
  gateways: HqGateway[];
  taxes: HqTax[];
  settings: HqOrgSettings;
};

export async function getCompany() {
  return api<HqCompany>("/api/console/setup/company");
}
export async function saveCompany(body: Partial<HqCompany>) {
  return api<HqCompany>("/api/console/setup/company", { method: "POST", body: JSON.stringify(body) });
}

export async function listBranches() {
  return api<HqBranch[]>("/api/console/setup/branches");
}
export async function saveBranch(body: Partial<HqBranch>) {
  return api<HqBranch>("/api/console/setup/branches", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteBranch(id: string) {
  await api(`/api/console/setup/branches/${id}`, { method: "DELETE" });
}

export async function listStores() {
  return api<HqStore[]>("/api/console/setup/stores");
}
export async function saveStore(body: Partial<HqStore>) {
  return api<HqStore>("/api/console/setup/stores", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteStore(id: string) {
  await api(`/api/console/setup/stores/${id}`, { method: "DELETE" });
}

export async function listStorefronts() {
  return api<HqStorefront[]>("/api/console/setup/storefronts");
}
export async function saveStorefront(body: Partial<HqStorefront>) {
  return api<HqStorefront>("/api/console/setup/storefronts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export async function deleteStorefront(id: string) {
  await api(`/api/console/setup/storefronts/${id}`, { method: "DELETE" });
}

export async function listGateways() {
  return api<HqGateway[]>("/api/console/setup/gateways");
}
export async function saveGateway(body: Partial<HqGateway>) {
  return api<HqGateway>("/api/console/setup/gateways", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteGateway(id: string) {
  await api(`/api/console/setup/gateways/${id}`, { method: "DELETE" });
}

export async function listTaxes() {
  return api<HqTax[]>("/api/console/setup/taxes");
}
export async function saveTax(body: Partial<HqTax>) {
  return api<HqTax>("/api/console/setup/taxes", { method: "POST", body: JSON.stringify(body) });
}
export async function deleteTax(id: string) {
  await api(`/api/console/setup/taxes/${id}`, { method: "DELETE" });
}

export async function getOrgSettings() {
  return api<HqOrgSettings>("/api/console/setup/settings");
}
export async function saveOrgSettings(body: Partial<HqOrgSettings>) {
  return api<HqOrgSettings>("/api/console/setup/settings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getSetupData() {
  return api<{
    branches: number;
    stores: number;
    storefronts: number;
    tills: number;
    gateways: number;
    taxes: number;
    sales: number;
    catalog: number;
  }>("/api/console/setup/data");
}

export async function purgeCatalogSeed() {
  return api<{ ok: true; total: number }>("/api/console/setup/data/purge-catalog", {
    method: "POST",
  });
}

export async function importCatalogRows(
  rows: Array<{
    id?: string;
    name?: string;
    category?: string;
    subcategory?: string;
    sku?: string;
    barcode?: string;
    batchNumber?: string;
    brand?: string;
    costMinor?: number;
    priceMinor?: number;
    onHand?: number;
    reorderLevel?: number;
    unit?: string;
    unitLabel?: string;
    packSize?: number;
    description?: string;
    active?: boolean;
    image?: string;
    expiresAt?: string;
  }>,
) {
  return api<{ created: number; updated: number; total: number }>("/api/console/setup/import/catalog", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function exportSetup(kind: "org" | "catalog" | "sales" | "all") {
  return api<unknown>(`/api/console/setup/export?kind=${kind}`);
}
