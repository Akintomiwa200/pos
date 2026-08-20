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

export type StoreKind = "retail" | "warehouse" | "dark-kitchen";

export type HqStore = {
  id: string;
  branchId: string;
  name: string;
  kind: StoreKind;
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

export type GatewayProvider = "paystack" | "flutterwave" | "moniepoint" | "bank" | "cash" | "card";

export type HqGateway = {
  id: string;
  name: string;
  provider: GatewayProvider;
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
  invoicePrefix: string;
  pricesIncludeVat: boolean;
  idleLockMinutes: number;
  requireOpenShift: boolean;
  lowStockQty: number;
  blockNegativeStock: boolean;
};

export const SEED_COMPANY: HqCompany = {
  id: "co-place",
  name: "The Place",
  legalName: "The Place Restaurants Limited",
  rc: "RC-1234567",
  tin: "12345678-0001",
  email: "accounts@theplace.ng",
  phone: "+234 801 234 5678",
  address: "14 Adeola Odeku Street, Victoria Island, Lagos",
  state: "Lagos",
  country: "Nigeria",
  currency: "NGN",
};

export const SEED_BRANCHES: HqBranch[] = [
  {
    id: "br-vi",
    companyId: "co-place",
    name: "Victoria Island",
    city: "Lagos",
    state: "Lagos",
    address: "14 Adeola Odeku Street",
    phone: "+234 801 234 5678",
    manager: "Chika Obi",
    active: true,
  },
  {
    id: "br-ikeja",
    companyId: "co-place",
    name: "Ikeja",
    city: "Ikeja",
    state: "Lagos",
    address: "Allen Avenue",
    phone: "+234 802 111 2233",
    manager: "Emma Bello",
    active: true,
  },
];

export const SEED_STORES: HqStore[] = [
  {
    id: "st-vi-retail",
    branchId: "br-vi",
    name: "VI Retail",
    kind: "retail",
    address: "14 Adeola Odeku Street",
    active: true,
  },
  {
    id: "st-ikeja-retail",
    branchId: "br-ikeja",
    name: "Ikeja Retail",
    kind: "retail",
    address: "Allen Avenue",
    active: true,
  },
];

export const SEED_STOREFRONTS: HqStorefront[] = [
  {
    id: "sf-vi",
    storeId: "st-vi-retail",
    name: "The Place VI shop",
    url: "https://shop.theplace.ng",
    hours: "08:00 – 22:00",
    enabled: false,
    syncPrices: true,
    syncStock: true,
  },
];

export const SEED_GATEWAYS: HqGateway[] = [
  {
    id: "gw-paystack",
    name: "Paystack",
    provider: "paystack",
    enabled: true,
    isDefault: true,
    publicKey: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
  },
  {
    id: "gw-moniepoint",
    name: "Moniepoint",
    provider: "moniepoint",
    enabled: true,
    isDefault: false,
    publicKey: "",
    accountName: "The Place VI",
    accountNumber: "0123456789",
    bankName: "Moniepoint MFB",
  },
  {
    id: "gw-cash",
    name: "Cash",
    provider: "cash",
    enabled: true,
    isDefault: false,
    publicKey: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
  },
  {
    id: "gw-card",
    name: "Card / POS",
    provider: "card",
    enabled: true,
    isDefault: false,
    publicKey: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
  },
];

export const SEED_TAXES: HqTax[] = [
  {
    id: "tax-vat",
    name: "VAT",
    ratePercent: 7.5,
    inclusive: false,
    compound: false,
    active: true,
    isDefault: true,
  },
  {
    id: "tax-service",
    name: "Service charge",
    ratePercent: 10,
    inclusive: false,
    compound: false,
    active: true,
    isDefault: false,
  },
];

export const SEED_SETTINGS: HqOrgSettings = {
  timezone: "Africa/Lagos",
  language: "en-NG",
  currency: "NGN",
  receiptHeader: "Goods sold are not returnable after 24 hours.",
  receiptFooter: "Thank you for shopping with us.",
  receiptPaper: "80mm",
  invoicePrefix: "INV",
  pricesIncludeVat: false,
  idleLockMinutes: 0,
  requireOpenShift: true,
  lowStockQty: 5,
  blockNegativeStock: true,
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
