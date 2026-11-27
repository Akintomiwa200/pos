import {
  DEFAULT_REGISTER_OUTLET_OVERRIDES,
  DEFAULT_REGISTER_QUICK_BUTTONS,
  DEFAULT_REGISTER_SALE_FIELDS,
  DEFAULT_REGISTER_TENDERS,
  type RegisterOutletOverride,
  type RegisterQuickButton,
  type RegisterSaleField,
  type RegisterTender,
} from "./register-config";
import { saveStoreSettings, loadStoreSettings, type StoreSettings } from "./store-settings";

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
    currency?: string;
    /** Company logo / profile picture URL. */
    logoUrl?: string | null;
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
    currency?: string;
    receiptHeader: string;
    receiptFooter: string;
    receiptPaper: "80mm" | "58mm";
    invoicePrefix: string;
    pricesIncludeVat: boolean;
    applyVat?: boolean;
    idleLockMinutes: number;
    requireOpenShift: boolean;
    lowStockQty: number;
    blockNegativeStock: boolean;
    allowPriceOverride?: boolean;
    allowDiscounts?: boolean;
    maxDiscountPercent?: number;
    requireManagerPin?: boolean;
    allowPartialRefunds?: boolean;
    restockOnRefund?: boolean;
    refundWithoutTicket?: boolean;
    tipsEnabled?: boolean;
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
    receiptShowLogo?: boolean;
    receiptShowTax?: boolean;
    showSkuOnReceipt?: boolean;
    printDuplicateReceipt?: boolean;
    receiptTemplate?: "classic" | "compact" | "bold" | "minimal";
    receiptBrandColor?: string;
    receiptTitle?: string;
    receiptAddress?: string;
    receiptEmail?: string;
    receiptBarcodeValue?: string;
    registerQuickButtons?: RegisterQuickButton[];
    registerSaleFields?: RegisterSaleField[];
    registerTenders?: RegisterTender[];
    registerOutletOverrides?: RegisterOutletOverride[];
  };
};

export type TillLocation = {
  branchId?: string;
  storeId?: string;
};

const ORG_KEY = "pos.hq-org.v1";
export const HQ_ORG_EVENT = "pos-hq-org";

export const TAX_OVERRIDE_FIELDS = [
  "applyVat",
  "vatPercent",
  "servicePercent",
  "applyServiceCharge",
  "pricesIncludeVat",
  "includeVatBreakdown",
  "receiptShowTax",
] as const;

const TAX_OVERRIDE_KEY = "pos.tax-overrides.v1";
const TAX_LASTWEB_KEY = "pos.tax-lastweb.v1";

export function getPinnedTaxFields(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(TAX_OVERRIDE_KEY);
    if (!raw) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((field) => typeof field === "string") : [],
    );
  } catch {
    return new Set<string>();
  }
}

/** Hold a tax field to this terminal's values. The web still wins when it actually changes that field. */
export function pinTaxFields(fields: string[]) {
  const pinned = new Set(getPinnedTaxFields());
  for (const field of fields) pinned.add(field);
  localStorage.setItem(TAX_OVERRIDE_KEY, JSON.stringify([...pinned]));
}

/** Drop all local holds. Saved values stay, but the next sync is free to pull dashboard values. */
export function clearTaxOverrides() {
  localStorage.removeItem(TAX_OVERRIDE_KEY);
  localStorage.removeItem(TAX_LASTWEB_KEY);
}

function loadLastWebTaxes(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(TAX_LASTWEB_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? { ...(parsed as Record<string, unknown>) } : {};
  } catch {
    return {};
  }
}

function resolveTaxFields(
  current: StoreSettings,
  next: StoreSettings,
  webTaxes: Record<string, unknown>,
): StoreSettings {
  const pinned = getPinnedTaxFields();
  const lastWeb = loadLastWebTaxes();
  const out = { ...next } as Record<string, unknown>;
  const base = current as unknown as Record<string, unknown>;
  for (const field of TAX_OVERRIDE_FIELDS) {
    const webValue = webTaxes[field];
    const last = lastWeb[field];
    const changed = webValue !== last;
    if (pinned.has(field) && !changed) {
      out[field] = base[field];
    } else if (pinned.has(field)) {
      const released = new Set(pinned);
      released.delete(field);
      localStorage.setItem(TAX_OVERRIDE_KEY, JSON.stringify([...released]));
    }
    lastWeb[field] = webValue;
  }
  localStorage.setItem(TAX_LASTWEB_KEY, JSON.stringify(lastWeb));
  return out as StoreSettings;
}

function flag(value: boolean | undefined, fallback: boolean) {
  return value ?? fallback;
}

export function formatBranchAddress(branch: HqOrgSnapshot["branches"][number]) {
  return [branch.address, branch.city, branch.state].map((part) => part.trim()).filter(Boolean).join(", ");
}

export function cacheHqOrg(org: HqOrgSnapshot) {
  localStorage.setItem(ORG_KEY, JSON.stringify(org));
  window.dispatchEvent(new Event(HQ_ORG_EVENT));
}

export function loadCachedHqOrg(): HqOrgSnapshot | null {
  try {
    const raw = localStorage.getItem(ORG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HqOrgSnapshot;
  } catch {
    return null;
  }
}

export function resolveTillBranch(org: HqOrgSnapshot, till?: TillLocation | null) {
  if (!till) return undefined;
  const byId = org.branches.find((row) => row.id && row.id === till.branchId);
  if (byId) return byId;
  if (till.storeId) {
    return org.branches.find((row) => row.storeId === till.storeId);
  }
  return undefined;
}

function resolveRegisterOverride(
  org: HqOrgSnapshot,
  till?: TillLocation | null,
): RegisterOutletOverride | undefined {
  const overrides = org.settings.registerOutletOverrides ?? [];
  if (!overrides.length || !till) return undefined;
  const branchId = till.branchId || resolveTillBranch(org, till)?.id;
  return (
    overrides.find((row) => row.scope === "branch" && row.id === branchId) ||
    overrides.find((row) => row.scope === "branch" && row.scopeId === branchId) ||
    overrides.find((row) => row.scope === "store" && row.scopeId === till.storeId) ||
    undefined
  );
}

export function applyHqOrg(org: HqOrgSnapshot, till?: TillLocation | null) {
  cacheHqOrg(org);
  const vat = org.taxes.find((row) => row.isDefault && row.active) ?? org.taxes.find((row) => row.active);
  const service = org.taxes.find((row) => /service/i.test(row.name) && row.active);
  const front = org.storefronts[0];
  const pay = org.gateways;
  const current = loadStoreSettings();
  const s = org.settings;
  const branch = resolveTillBranch(org, till);
  const branchAddress = branch ? formatBranchAddress(branch) : "";
  const branchPhone = branch?.phone?.trim() || "";
  const branchName = branch?.name?.trim() || "";
  const registerOverride = resolveRegisterOverride(org, till);
  const showTax = flag(s.receiptShowTax, current.receiptShowTax);
  const copies = Math.max(
    1,
    registerOverride?.receiptCopies ?? s.receiptCopies ?? current.receiptCopies,
  );
  const duplicate =
    registerOverride?.printDuplicateReceipt ??
    flag(s.printDuplicateReceipt, current.printDuplicateReceipt);
  const quickButtons = Array.isArray(s.registerQuickButtons)
    ? s.registerQuickButtons
    : Array.isArray(current.registerQuickButtons)
      ? current.registerQuickButtons
      : DEFAULT_REGISTER_QUICK_BUTTONS;
  const saleFields = Array.isArray(s.registerSaleFields)
    ? s.registerSaleFields
    : Array.isArray(current.registerSaleFields)
      ? current.registerSaleFields
      : DEFAULT_REGISTER_SALE_FIELDS;
  const baseTenders = Array.isArray(s.registerTenders)
    ? s.registerTenders
    : Array.isArray(current.registerTenders)
      ? current.registerTenders
      : DEFAULT_REGISTER_TENDERS;
  const outletOverrides = Array.isArray(s.registerOutletOverrides)
    ? s.registerOutletOverrides
    : Array.isArray(current.registerOutletOverrides)
      ? current.registerOutletOverrides
      : DEFAULT_REGISTER_OUTLET_OVERRIDES;
  const outletTenders = registerOverride?.enabledTenders;
  const registerTenders =
    outletTenders === undefined
      ? baseTenders
      : baseTenders.map((tender) => ({
          ...tender,
          active: tender.active && outletTenders.includes(tender.id),
        }));
  const tenderActive = (id: RegisterTender["id"], fallback: boolean) =>
    registerTenders.find((tender) => tender.id === id)?.active ?? fallback;

  const next: StoreSettings = {
    ...current,
    currency: s.currency?.trim() || org.company.currency || current.currency,
    storeName: s.receiptTitle?.trim() || org.company.name,
    receiptLocation: branchName,
    companyLegalName: org.company.legalName,
    companyRc: org.company.rc,
    storeTin: org.company.tin,
    companyEmail: org.company.email,
    storePhone: branchPhone || org.company.phone,
    storeAddress: branchAddress || s.receiptAddress?.trim() || org.company.address,
    storeEmail: s.receiptEmail?.trim() || org.company.email,
    companyState: org.company.state,
    applyVat: s.applyVat ?? current.applyVat,
    vatPercent: vat?.ratePercent ?? current.vatPercent,
    servicePercent: service?.ratePercent ?? current.servicePercent,
    applyServiceCharge: Boolean(service),
    pricesIncludeVat: vat?.inclusive ?? s.pricesIncludeVat ?? current.pricesIncludeVat,
    includeVatBreakdown: showTax,
    receiptShowTax: showTax,
    receiptHeader: s.receiptHeader ?? "",
    receiptFooter: registerOverride?.receiptFooter ?? s.receiptFooter ?? "",
    receiptPaper: s.receiptPaper ?? current.receiptPaper,
    receiptBrandColor: s.receiptBrandColor?.trim() || current.receiptBrandColor,
    receiptBarcodeValue: s.receiptBarcodeValue?.trim() || "",
    invoicePrefix: s.invoicePrefix || current.invoicePrefix,
    idleLockMinutes: registerOverride?.idleLockMinutes ?? s.idleLockMinutes,
    requireOpenShift: registerOverride?.requireOpenShift ?? s.requireOpenShift,
    registerQuickButtons: quickButtons,
    registerSaleFields: saleFields,
    registerTenders,
    registerOutletOverrides: outletOverrides,
    lowStockQty: s.lowStockQty,
    blockNegativeStock: s.blockNegativeStock,
    allowPriceOverride: s.allowPriceOverride ?? current.allowPriceOverride,
    allowDiscounts: s.allowDiscounts ?? current.allowDiscounts,
    maxDiscountPercent: s.maxDiscountPercent ?? current.maxDiscountPercent,
    requireManagerPin: s.requireManagerPin ?? current.requireManagerPin,
    allowPartialRefunds: s.allowPartialRefunds ?? current.allowPartialRefunds,
    restockOnRefund: s.restockOnRefund ?? current.restockOnRefund,
    refundWithoutTicket: s.refundWithoutTicket ?? current.refundWithoutTicket,
    tipsEnabled: s.tipsEnabled ?? current.tipsEnabled,
    autoPrintReceipt:
      registerOverride?.autoPrintReceipt ?? s.autoPrintReceipt ?? current.autoPrintReceipt,
    openCashDrawer: s.openCashDrawer ?? current.openCashDrawer,
    receiptCopies: duplicate ? Math.max(2, copies) : copies,
    printDuplicateReceipt: duplicate,
    holdExpiryMinutes: s.holdExpiryMinutes ?? current.holdExpiryMinutes,
    receiptShowCashier: flag(s.receiptShowCashier, current.receiptShowCashier),
    receiptShowBarcode: flag(s.receiptShowBarcode, current.receiptShowBarcode),
    receiptShowTicketNumber: flag(s.receiptShowTicketNumber, current.receiptShowTicketNumber),
    receiptShowDate: flag(s.receiptShowDate, current.receiptShowDate),
    receiptShowCustomer: flag(s.receiptShowCustomer, current.receiptShowCustomer),
    receiptShowCustomerPhone: flag(s.receiptShowCustomerPhone, current.receiptShowCustomerPhone),
    receiptShowTill: flag(s.receiptShowTill, current.receiptShowTill),
    receiptShowTender: flag(s.receiptShowTender, current.receiptShowTender),
    receiptShowChange: flag(s.receiptShowChange, current.receiptShowChange),
    receiptShowLoyalty: flag(s.receiptShowLoyalty, current.receiptShowLoyalty),
    receiptShowLoyaltyBalance: flag(s.receiptShowLoyaltyBalance, current.receiptShowLoyaltyBalance),
    receiptShowLoyaltyRedeemed: flag(s.receiptShowLoyaltyRedeemed, current.receiptShowLoyaltyRedeemed),
    receiptShowLoyaltyEarned: flag(s.receiptShowLoyaltyEarned, current.receiptShowLoyaltyEarned),
    receiptShowGiftCard: flag(s.receiptShowGiftCard, current.receiptShowGiftCard),
    receiptShowGiftCardBalance: flag(s.receiptShowGiftCardBalance, current.receiptShowGiftCardBalance),
    receiptShowTitle: flag(s.receiptShowTitle, current.receiptShowTitle),
    receiptShowAddress: flag(s.receiptShowAddress, current.receiptShowAddress),
    receiptShowEmail: flag(s.receiptShowEmail, current.receiptShowEmail),
    receiptShowPhone: flag(s.receiptShowPhone, current.receiptShowPhone),
    receiptShowHeader: flag(s.receiptShowHeader, current.receiptShowHeader),
    receiptShowFooter: flag(s.receiptShowFooter, current.receiptShowFooter),
    receiptShowDiscount: flag(s.receiptShowDiscount, current.receiptShowDiscount),
    receiptShowPoweredBy: flag(s.receiptShowPoweredBy, current.receiptShowPoweredBy),
    receiptShowLogo: flag(s.receiptShowLogo, current.receiptShowLogo),
    companyLogoUrl: org.company.logoUrl || "",
    showSkuOnReceipt:
      registerOverride?.showSkuOnReceipt ?? flag(s.showSkuOnReceipt, current.showSkuOnReceipt),
    receiptTemplate:
      registerOverride?.receiptTemplate ?? s.receiptTemplate ?? current.receiptTemplate,
    storefrontEnabled: front?.enabled ?? current.storefrontEnabled,
    storefrontUrl: front?.url || current.storefrontUrl,
    storefrontSyncPrices: front?.syncPrices ?? current.storefrontSyncPrices,
    storefrontSyncStock: front?.syncStock ?? current.storefrontSyncStock,
    storeHours: front?.hours || current.storeHours,
    payCash: tenderActive(
      "cash",
      pay.length ? pay.some((row) => row.provider === "cash" && row.enabled) : current.payCash,
    ),
    payCard: tenderActive(
      "card",
      pay.length ? pay.some((row) => row.provider === "card" && row.enabled) : current.payCard,
    ),
    payTransfer: tenderActive(
      "transfer",
      pay.length
        ? pay.some((row) => (row.provider === "bank" || row.provider === "moniepoint") && row.enabled)
        : current.payTransfer,
    ),
    payWallet: tenderActive(
      "wallet",
      pay.some((row) => row.provider === "paystack" && row.enabled) || current.payWallet,
    ),
    paySplit: tenderActive("split", current.paySplit),
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
  };

  const webTaxes: Record<string, unknown> = {
    applyVat: s.applyVat,
    vatPercent: vat?.ratePercent,
    servicePercent: service?.ratePercent,
    applyServiceCharge: Boolean(service),
    pricesIncludeVat: vat?.inclusive ?? s.pricesIncludeVat,
    includeVatBreakdown: s.receiptShowTax,
    receiptShowTax: s.receiptShowTax,
  };

  saveStoreSettings(resolveTaxFields(current, next, webTaxes));
}

export function applyHqSettingsPatch(
  settings: HqOrgSnapshot["settings"],
  till?: TillLocation | null,
) {
  const cached = loadCachedHqOrg();
  if (cached) {
    applyHqOrg({ ...cached, settings: { ...cached.settings, ...settings } }, till);
    return;
  }
  applyHqOrg(
    {
      company: {
        name: "",
        legalName: "",
        rc: "",
        tin: "",
        email: "",
        phone: "",
        address: "",
        state: "",
      },
      branches: [],
      stores: [],
      storefronts: [],
      gateways: [],
      taxes: [],
      settings,
    },
    till,
  );
}
