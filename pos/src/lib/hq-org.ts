import { saveStoreSettings, loadStoreSettings } from "./store-settings";

export type HqOrgSnapshot = {
  company: {
    name: string;
    legalName: string;
    rc: string;
    tin: string;
    email: string;
    phone: string;
    address: string;
    state: string;
  };
  branches: Array<{
    id: string;
    name: string;
    storeId?: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    manager: string;
    active: boolean;
  }>;
  stores: Array<{
    id: string;
    name: string;
    active?: boolean;
  }>;
  storefronts: Array<{
    url: string;
    hours: string;
    enabled: boolean;
    syncPrices: boolean;
    syncStock: boolean;
  }>;
  gateways: Array<{
    provider: string;
    enabled: boolean;
    isDefault: boolean;
    accountName: string;
    accountNumber: string;
    bankName: string;
  }>;
  taxes: Array<{
    name: string;
    ratePercent: number;
    inclusive: boolean;
    active: boolean;
    isDefault: boolean;
  }>;
  settings: {
    receiptHeader: string;
    receiptFooter: string;
    receiptPaper: "80mm" | "58mm";
    invoicePrefix: string;
    pricesIncludeVat: boolean;
    idleLockMinutes: number;
    requireOpenShift: boolean;
    lowStockQty: number;
    blockNegativeStock: boolean;
    allowPriceOverride?: boolean;
    requireManagerPin?: boolean;
    allowPartialRefunds?: boolean;
    restockOnRefund?: boolean;
    refundWithoutTicket?: boolean;
    autoPrintReceipt?: boolean;
    openCashDrawer?: boolean;
    receiptCopies?: number;
    holdExpiryMinutes?: number;
    receiptShowCashier?: boolean;
    receiptShowBarcode?: boolean;
    receiptShowTicketNumber?: boolean;
    receiptShowDate?: boolean;
    receiptShowCustomer?: boolean;
    receiptShowCustomerPhone?: boolean;
    receiptShowTill?: boolean;
    receiptShowTender?: boolean;
    receiptShowChange?: boolean;
    receiptShowLoyalty?: boolean;
    receiptShowLoyaltyBalance?: boolean;
    receiptShowLoyaltyRedeemed?: boolean;
    receiptShowLoyaltyEarned?: boolean;
    receiptShowGiftCard?: boolean;
    receiptShowGiftCardBalance?: boolean;
    receiptShowTitle?: boolean;
    receiptShowAddress?: boolean;
    receiptShowEmail?: boolean;
    receiptShowPhone?: boolean;
    receiptShowHeader?: boolean;
    receiptShowFooter?: boolean;
    receiptShowDiscount?: boolean;
    receiptShowPoweredBy?: boolean;
    receiptTitle?: string;
    receiptAddress?: string;
    receiptEmail?: string;
  };
};

export function applyHqOrg(org: HqOrgSnapshot) {
  const vat = org.taxes.find((row) => row.isDefault && row.active) ?? org.taxes.find((row) => row.active);
  const service = org.taxes.find((row) => /service/i.test(row.name) && row.active);
  const front = org.storefronts[0];
  const pay = org.gateways;
  const current = loadStoreSettings();
  const s = org.settings;
  saveStoreSettings({
    ...current,
    storeName: s.receiptTitle?.trim() || org.company.name,
    companyLegalName: org.company.legalName,
    companyRc: org.company.rc,
    storeTin: org.company.tin,
    companyEmail: org.company.email,
    storePhone: org.company.phone,
    storeAddress: s.receiptAddress?.trim() || org.company.address,
    storeEmail: s.receiptEmail?.trim() || org.company.email,
    companyState: org.company.state,
    vatPercent: vat?.ratePercent ?? current.vatPercent,
    servicePercent: service?.ratePercent ?? current.servicePercent,
    pricesIncludeVat: vat?.inclusive ?? s.pricesIncludeVat,
    receiptHeader: s.receiptHeader,
    receiptFooter: s.receiptFooter,
    receiptPaper: s.receiptPaper,
    invoicePrefix: s.invoicePrefix,
    idleLockMinutes: s.idleLockMinutes,
    requireOpenShift: s.requireOpenShift,
    lowStockQty: s.lowStockQty,
    blockNegativeStock: s.blockNegativeStock,
    allowPriceOverride: s.allowPriceOverride ?? current.allowPriceOverride,
    requireManagerPin: s.requireManagerPin ?? current.requireManagerPin,
    allowPartialRefunds: s.allowPartialRefunds ?? current.allowPartialRefunds,
    restockOnRefund: s.restockOnRefund ?? current.restockOnRefund,
    refundWithoutTicket: s.refundWithoutTicket ?? current.refundWithoutTicket,
    autoPrintReceipt: s.autoPrintReceipt ?? current.autoPrintReceipt,
    openCashDrawer: s.openCashDrawer ?? current.openCashDrawer,
    receiptCopies: s.receiptCopies ?? current.receiptCopies,
    holdExpiryMinutes: s.holdExpiryMinutes ?? current.holdExpiryMinutes,
    receiptShowCashier: s.receiptShowCashier ?? current.receiptShowCashier,
    receiptShowBarcode: s.receiptShowBarcode ?? current.receiptShowBarcode,
    receiptShowTicketNumber: s.receiptShowTicketNumber ?? current.receiptShowTicketNumber,
    receiptShowDate: s.receiptShowDate ?? current.receiptShowDate,
    receiptShowCustomer: s.receiptShowCustomer ?? current.receiptShowCustomer,
    receiptShowCustomerPhone: s.receiptShowCustomerPhone ?? current.receiptShowCustomerPhone,
    receiptShowTill: s.receiptShowTill ?? current.receiptShowTill,
    receiptShowTender: s.receiptShowTender ?? current.receiptShowTender,
    receiptShowChange: s.receiptShowChange ?? current.receiptShowChange,
    receiptShowLoyalty: s.receiptShowLoyalty ?? current.receiptShowLoyalty,
    receiptShowLoyaltyBalance: s.receiptShowLoyaltyBalance ?? current.receiptShowLoyaltyBalance,
    receiptShowLoyaltyRedeemed:
      s.receiptShowLoyaltyRedeemed ?? current.receiptShowLoyaltyRedeemed,
    receiptShowLoyaltyEarned: s.receiptShowLoyaltyEarned ?? current.receiptShowLoyaltyEarned,
    receiptShowGiftCard: s.receiptShowGiftCard ?? current.receiptShowGiftCard,
    receiptShowGiftCardBalance:
      s.receiptShowGiftCardBalance ?? current.receiptShowGiftCardBalance,
    receiptShowTitle: s.receiptShowTitle ?? current.receiptShowTitle,
    receiptShowAddress: s.receiptShowAddress ?? current.receiptShowAddress,
    receiptShowEmail: s.receiptShowEmail ?? current.receiptShowEmail,
    receiptShowPhone: s.receiptShowPhone ?? current.receiptShowPhone,
    receiptShowHeader: s.receiptShowHeader ?? current.receiptShowHeader,
    receiptShowFooter: s.receiptShowFooter ?? current.receiptShowFooter,
    receiptShowDiscount: s.receiptShowDiscount ?? current.receiptShowDiscount,
    receiptShowPoweredBy: s.receiptShowPoweredBy ?? current.receiptShowPoweredBy,
    storefrontEnabled: front?.enabled ?? current.storefrontEnabled,
    storefrontUrl: front?.url || current.storefrontUrl,
    storefrontSyncPrices: front?.syncPrices ?? current.storefrontSyncPrices,
    storefrontSyncStock: front?.syncStock ?? current.storefrontSyncStock,
    storeHours: front?.hours || current.storeHours,
    payCash: pay.length ? pay.some((row) => row.provider === "cash" && row.enabled) : current.payCash,
    payCard: pay.length ? pay.some((row) => row.provider === "card" && row.enabled) : current.payCard,
    payTransfer: pay.length
      ? pay.some((row) => (row.provider === "bank" || row.provider === "moniepoint") && row.enabled)
      : current.payTransfer,
    payWallet: pay.some((row) => row.provider === "paystack" && row.enabled) || current.payWallet,
    gatewayPaystack: pay.some((row) => row.provider === "paystack" && row.enabled),
    gatewayFlutterwave: pay.some((row) => row.provider === "flutterwave" && row.enabled),
    gatewayMoniepoint: pay.some((row) => row.provider === "moniepoint" && row.enabled),
    gatewayDefault: (() => {
      const def = pay.find((row) => row.isDefault)?.provider;
      return def === "paystack" || def === "moniepoint" || def === "flutterwave"
        ? def
        : current.gatewayDefault;
    })(),
    payAccountName: pay.find((row) => row.accountName)?.accountName || current.payAccountName,
    payAccountNumber: pay.find((row) => row.accountNumber)?.accountNumber || current.payAccountNumber,
    payBankName: pay.find((row) => row.bankName)?.bankName || current.payBankName,
  });
}
