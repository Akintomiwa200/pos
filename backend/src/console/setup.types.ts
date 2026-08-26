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
  storeId?: string;
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
  companyId: string;
  /** Legacy; stores are company-wide and cover every branch. */
  branchId?: string;
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
  receiptTemplate: "classic" | "compact" | "bold" | "minimal";
  receiptBrandColor: string;
  receiptShowLogo: boolean;
  receiptShowTax: boolean;
  receiptShowCashier: boolean;
  receiptShowBarcode: boolean;
  /** Store title printed at top of receipt (overrides company name when set). */
  receiptTitle: string;
  /** Branch / store address line on the ticket. */
  receiptAddress: string;
  /** Contact email printed on the ticket. */
  receiptEmail: string;
  /** Sample / preview ticket id encoded as Code 128. */
  receiptBarcodeValue: string;
  /** Show “Powered by Herkintormiwer” on the ticket. */
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
    id: "st-demo-retail",
    companyId: "co-place",
    name: "Demo Store",
    kind: "retail",
    address: "",
    active: true,
  },
];

export const SEED_STOREFRONTS: HqStorefront[] = [
  {
    id: "sf-vi",
    storeId: "st-demo-retail",
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
  receiptTemplate: "classic",
  receiptBrandColor: "#111827",
  receiptShowLogo: true,
  receiptShowTax: true,
  receiptShowCashier: true,
  receiptShowBarcode: true,
  receiptTitle: "The Place",
  receiptAddress: "14 Adeola Odeku Street, Victoria Island, Lagos",
  receiptEmail: "accounts@theplace.ng",
  receiptBarcodeValue: "10482001933",
  receiptShowPoweredBy: true,
  receiptShowTicketNumber: true,
  receiptShowDate: true,
  receiptShowCustomer: true,
  receiptShowCustomerPhone: true,
  receiptShowTill: true,
  receiptShowTender: true,
  receiptShowChange: true,
  receiptShowLoyalty: true,
  receiptShowLoyaltyBalance: true,
  receiptShowLoyaltyRedeemed: true,
  receiptShowLoyaltyEarned: true,
  receiptShowGiftCard: true,
  receiptShowGiftCardBalance: true,
  receiptShowTitle: true,
  receiptShowAddress: true,
  receiptShowEmail: true,
  receiptShowPhone: true,
  receiptShowHeader: true,
  receiptShowFooter: true,
  receiptShowDiscount: true,
  invoicePrefix: "INV",
  invoiceNextNumber: 1001,
  invoiceTemplate: "sapphire",
  invoiceBrandColor: "#0F2C59",
  invoicePanelColor: "#5788D3",
  invoiceShowLogo: true,
  invoiceTerms: "Payment is due within 7 days. Goods remain property of the seller until paid in full.",
  invoicePaymentNote: "Transfer to the account on your statement. Quote the invoice number.",
  pricesIncludeVat: false,
  idleLockMinutes: 0,
  requireOpenShift: true,
  lowStockQty: 5,
  blockNegativeStock: true,
  printDuplicateReceipt: false,
  showSkuOnReceipt: false,
  allowPriceOverride: false,
  requireManagerPin: true,
  allowDiscounts: true,
  maxDiscountPercent: 20,
  allowPartialRefunds: true,
  restockOnRefund: true,
  refundWithoutTicket: false,
  tipsEnabled: false,
  holdExpiryMinutes: 120,
  autoPrintReceipt: true,
  openCashDrawer: true,
  receiptCopies: 1,
  notifyLowStock: true,
  notifyNewSale: false,
  notifyRefund: true,
  notifyShiftClose: true,
  notifyDailySummary: true,
  passwordMinLength: 6,
  sessionTimeoutMinutes: 0,
  uiTheme: "system",
  uiFont: "inter",
  uiAccent: "violet",
  uiDensity: "comfortable",
  uiReduceMotion: false,
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
