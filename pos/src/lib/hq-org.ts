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
    address: string;
    city: string;
    state: string;
    phone: string;
    manager: string;
    active: boolean;
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
  };
};

export function applyHqOrg(org: HqOrgSnapshot) {
  const vat = org.taxes.find((row) => row.isDefault && row.active) ?? org.taxes.find((row) => row.active);
  const service = org.taxes.find((row) => /service/i.test(row.name) && row.active);
  const front = org.storefronts[0];
  const pay = org.gateways;
  const current = loadStoreSettings();
  saveStoreSettings({
    ...current,
    storeName: org.company.name,
    companyLegalName: org.company.legalName,
    companyRc: org.company.rc,
    storeTin: org.company.tin,
    companyEmail: org.company.email,
    storePhone: org.company.phone,
    storeAddress: org.company.address,
    companyState: org.company.state,
    vatPercent: vat?.ratePercent ?? current.vatPercent,
    servicePercent: service?.ratePercent ?? current.servicePercent,
    pricesIncludeVat: vat?.inclusive ?? org.settings.pricesIncludeVat,
    receiptHeader: org.settings.receiptHeader,
    receiptFooter: org.settings.receiptFooter,
    receiptPaper: org.settings.receiptPaper,
    invoicePrefix: org.settings.invoicePrefix,
    idleLockMinutes: org.settings.idleLockMinutes,
    requireOpenShift: org.settings.requireOpenShift,
    lowStockQty: org.settings.lowStockQty,
    blockNegativeStock: org.settings.blockNegativeStock,
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
