const KEY = "pos.store-settings.v1";
export const SETTINGS_EVENT = "pos-settings";

export type SyncMode = "daily" | "realtime";
export type StockMode = "online" | "offline" | "both";
export type BarcodeSuffix = "enter" | "tab" | "none";
export type LoyaltyPrompt = "card" | "phone" | "either";
export type ReceiptPaper = "80mm" | "58mm";
export type GatewayId = "paystack" | "moniepoint" | "flutterwave";

export type StoreSettings = {
  vatPercent: number;
  servicePercent: number;
  pricesIncludeVat: boolean;
  applyServiceCharge: boolean;
  showTinOnReceipt: boolean;
  showOutOfStock: boolean;
  allowPriceOverride: boolean;
  trackStockOnTill: boolean;
  stockMode: StockMode;
  requireBarcode: boolean;
  barcodeBeep: boolean;
  barcodeStripZeros: boolean;
  barcodeSuffix: BarcodeSuffix;
  barcodePrefix: string;
  barcodeMinLength: number;
  barcodeAllowManual: boolean;
  syncPriceCheck: boolean;
  hideEmptyCategories: boolean;
  sortCategoriesAz: boolean;
  allowUncategorized: boolean;
  showCategoryOnKitchen: boolean;
  hiddenCategories: string[];
  invoicePrefix: string;
  nextInvoiceNumber: number;
  autoPrintInvoice: boolean;
  includeVatBreakdown: boolean;
  emailInvoiceCopy: boolean;
  markPaidOnTill: boolean;
  invoiceShowCustomer: boolean;
  holdExpiryMinutes: number;
  autoCancelExpiredHolds: boolean;
  requireNameOnHold: boolean;
  showHoldsOnAllTills: boolean;
  soundOnHoldRecall: boolean;
  requireManagerPin: boolean;
  allowPartialRefunds: boolean;
  autoPrintRefund: boolean;
  restockOnRefund: boolean;
  refundWithoutTicket: boolean;
  quickbooks: boolean;
  sage: boolean;
  zoho: boolean;
  firs: boolean;
  syncMode: SyncMode;
  includeServiceInExport: boolean;
  autoPrintReceipt: boolean;
  printKitchenOnSend: boolean;
  openCashDrawer: boolean;
  receiptCopies: number;
  receiptFooter: string;
  receiptHeader: string;
  receiptShowCashier: boolean;
  receiptShowBarcode: boolean;
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
  receiptShowPoweredBy: boolean;
  receiptPaper: ReceiptPaper;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeTin: string;
  storeEmail: string;
  storeHours: string;
  companyLegalName: string;
  companyEmail: string;
  companyRc: string;
  companyState: string;
  loyaltyEnabled: boolean;
  loyaltyAllowSkip: boolean;
  loyaltyMinDigits: number;
  loyaltyPrompt: LoyaltyPrompt;
  loyaltyEarnNaira: number;
  loyaltyRedeemMinor: number;
  loyaltyAutoApply: boolean;
  payCash: boolean;
  payCard: boolean;
  payTransfer: boolean;
  payWallet: boolean;
  paySplit: boolean;
  payAccountName: string;
  payAccountNumber: string;
  payBankName: string;
  payWalletHint: string;
  activeTillId: string;
  storefrontEnabled: boolean;
  storefrontUrl: string;
  storefrontSyncPrices: boolean;
  storefrontSyncStock: boolean;
  gatewayPaystack: boolean;
  gatewayMoniepoint: boolean;
  gatewayFlutterwave: boolean;
  gatewayDefault: GatewayId;
  idleLockMinutes: number;
  requireOpenShift: boolean;
  lowStockAlert: boolean;
  lowStockQty: number;
  blockNegativeStock: boolean;
};

export function defaultStoreSettings(): StoreSettings {
  return {
    vatPercent: 7.5,
    servicePercent: 10,
    pricesIncludeVat: false,
    applyServiceCharge: true,
    showTinOnReceipt: true,
    showOutOfStock: true,
    allowPriceOverride: false,
    trackStockOnTill: true,
    stockMode: "both",
    requireBarcode: false,
    barcodeBeep: true,
    barcodeStripZeros: false,
    barcodeSuffix: "enter",
    barcodePrefix: "",
    barcodeMinLength: 4,
    barcodeAllowManual: true,
    syncPriceCheck: true,
    hideEmptyCategories: true,
    sortCategoriesAz: false,
    allowUncategorized: false,
    showCategoryOnKitchen: true,
    hiddenCategories: [],
    invoicePrefix: "INV",
    nextInvoiceNumber: 1001,
    autoPrintInvoice: false,
    includeVatBreakdown: true,
    emailInvoiceCopy: false,
    markPaidOnTill: true,
    invoiceShowCustomer: true,
    holdExpiryMinutes: 30,
    autoCancelExpiredHolds: false,
    requireNameOnHold: true,
    showHoldsOnAllTills: true,
    soundOnHoldRecall: false,
    requireManagerPin: true,
    allowPartialRefunds: true,
    autoPrintRefund: true,
    restockOnRefund: true,
    refundWithoutTicket: false,
    quickbooks: false,
    sage: false,
    zoho: false,
    firs: true,
    syncMode: "daily",
    includeServiceInExport: true,
    autoPrintReceipt: true,
    printKitchenOnSend: true,
    openCashDrawer: true,
    receiptCopies: 1,
    receiptFooter: "Thank you for shopping with us.",
    receiptHeader: "Goods sold are not returnable after 24 hours.",
    receiptShowCashier: true,
    receiptShowBarcode: false,
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
    receiptShowPoweredBy: true,
    receiptPaper: "80mm",
    storeName: "The Place — Victoria Island",
    storeAddress: "14 Adeola Odeku Street, Victoria Island, Lagos",
    storePhone: "+234 801 234 5678",
    storeTin: "12345678-0001",
    storeEmail: "vi@theplace.ng",
    storeHours: "08:00 – 22:00",
    companyLegalName: "The Place Restaurants Limited",
    companyEmail: "accounts@theplace.ng",
    companyRc: "RC-1234567",
    companyState: "Lagos",
    loyaltyEnabled: true,
    loyaltyAllowSkip: true,
    loyaltyMinDigits: 6,
    loyaltyPrompt: "either",
    loyaltyEarnNaira: 100,
    loyaltyRedeemMinor: 100,
    loyaltyAutoApply: false,
    payCash: true,
    payCard: true,
    payTransfer: true,
    payWallet: true,
    paySplit: true,
    payAccountName: "The Place VI",
    payAccountNumber: "0123456789",
    payBankName: "GTBank",
    payWalletHint: "OPay, PalmPay, or Kuda — confirm the credit before closing.",
    activeTillId: "till-1",
    storefrontEnabled: false,
    storefrontUrl: "https://shop.theplace.ng",
    storefrontSyncPrices: true,
    storefrontSyncStock: true,
    gatewayPaystack: true,
    gatewayMoniepoint: true,
    gatewayFlutterwave: false,
    gatewayDefault: "paystack",
    idleLockMinutes: 0,
    requireOpenShift: true,
    lowStockAlert: true,
    lowStockQty: 5,
    blockNegativeStock: true,
  };
}

export function loadStoreSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStoreSettings();
    return { ...defaultStoreSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultStoreSettings();
  }
}

export function saveStoreSettings(settings: StoreSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function enabledTenders(settings = loadStoreSettings()) {
  const ids: Array<"cash" | "card" | "transfer" | "wallet" | "split"> = [];
  if (settings.payCash) ids.push("cash");
  if (settings.payCard) ids.push("card");
  if (settings.payTransfer) ids.push("transfer");
  if (settings.payWallet) ids.push("wallet");
  if (settings.paySplit) ids.push("split");
  return ids.length ? ids : (["cash"] satisfies typeof ids);
}

export function normalizeBarcode(raw: string, settings = loadStoreSettings()) {
  let code = raw.trim();
  const prefix = settings.barcodePrefix.trim();
  if (prefix && code.toUpperCase().startsWith(prefix.toUpperCase())) {
    code = code.slice(prefix.length);
  }
  if (settings.barcodeStripZeros) code = code.replace(/^0+/, "");
  return code.trim();
}

export function takeNextTicketId(settings = loadStoreSettings()) {
  const ticketId = `${settings.invoicePrefix}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;
  saveStoreSettings({
    ...settings,
    nextInvoiceNumber: settings.nextInvoiceNumber + 1,
  });
  return ticketId;
}

export function loyaltyPointsEarned(
  totalMinor: number,
  settings = loadStoreSettings(),
) {
  if (!settings.loyaltyEnabled || settings.loyaltyEarnNaira <= 0) return 0;
  return Math.floor(totalMinor / 100 / settings.loyaltyEarnNaira);
}
