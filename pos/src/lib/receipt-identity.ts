import {
  formatBranchAddress,
  loadCachedHqOrg,
  resolveTillBranch,
  type HqOrgSnapshot,
  type TillLocation,
} from "./hq-org";
import { loadDeviceTill } from "./tills";
import type { StoreSettings } from "./store-settings";

/** HQ layout + this till's branch / location, resolved at print time. */
export function overlayReceiptIdentity(
  settings: StoreSettings,
  till: TillLocation | null = loadDeviceTill(),
  org: HqOrgSnapshot | null = loadCachedHqOrg(),
): StoreSettings {
  if (!org) return settings;
  const s = org.settings;
  const company = org.company;
  const branch = resolveTillBranch(org, till);
  const branchAddress = branch ? formatBranchAddress(branch) : "";
  const branchPhone = branch?.phone?.trim() || "";
  const branchName = branch?.name?.trim() || "";
  const service = org.taxes.find((row) => /service/i.test(row.name) && row.active);
  const vat =
    org.taxes.find((row) => row.isDefault && row.active) ??
    org.taxes.find((row) => row.active);
  const showTax = s.receiptShowTax ?? settings.receiptShowTax;

  return {
    ...settings,
    currency: s.currency?.trim() || company.currency || settings.currency,
    storeName: s.receiptTitle?.trim() || company.name || settings.storeName,
    receiptLocation: branchName,
    storeAddress:
      branchAddress || s.receiptAddress?.trim() || company.address || settings.storeAddress,
    storePhone: branchPhone || company.phone || settings.storePhone,
    storeEmail: s.receiptEmail?.trim() || company.email || settings.storeEmail,
    storeTin: company.tin || settings.storeTin,
    companyEmail: company.email || settings.companyEmail,
    companyLegalName: company.legalName || settings.companyLegalName,
    companyRc: company.rc || settings.companyRc,
    companyState: company.state || settings.companyState,
    vatPercent: vat?.ratePercent ?? settings.vatPercent,
    servicePercent: service?.ratePercent ?? settings.servicePercent,
    applyServiceCharge: Boolean(service),
    pricesIncludeVat: vat?.inclusive ?? s.pricesIncludeVat ?? settings.pricesIncludeVat,
    includeVatBreakdown: showTax,
    receiptShowTax: showTax,
    receiptHeader: s.receiptHeader ?? settings.receiptHeader,
    receiptFooter: s.receiptFooter ?? settings.receiptFooter,
    receiptPaper: s.receiptPaper ?? settings.receiptPaper,
    receiptBrandColor: s.receiptBrandColor?.trim() || settings.receiptBrandColor,
    receiptBarcodeValue: s.receiptBarcodeValue?.trim() || "",
    receiptTemplate: s.receiptTemplate ?? settings.receiptTemplate,
    receiptCopies: s.printDuplicateReceipt
      ? Math.max(2, s.receiptCopies ?? settings.receiptCopies)
      : Math.max(1, s.receiptCopies ?? settings.receiptCopies),
    autoPrintReceipt: s.autoPrintReceipt ?? settings.autoPrintReceipt,
    openCashDrawer: s.openCashDrawer ?? settings.openCashDrawer,
    printDuplicateReceipt: s.printDuplicateReceipt ?? settings.printDuplicateReceipt,
    showSkuOnReceipt: s.showSkuOnReceipt ?? settings.showSkuOnReceipt,
    receiptShowCashier: s.receiptShowCashier ?? settings.receiptShowCashier,
    receiptShowBarcode: s.receiptShowBarcode ?? settings.receiptShowBarcode,
    receiptShowTicketNumber: s.receiptShowTicketNumber ?? settings.receiptShowTicketNumber,
    receiptShowDate: s.receiptShowDate ?? settings.receiptShowDate,
    receiptShowCustomer: s.receiptShowCustomer ?? settings.receiptShowCustomer,
    receiptShowCustomerPhone: s.receiptShowCustomerPhone ?? settings.receiptShowCustomerPhone,
    receiptShowTill: s.receiptShowTill ?? settings.receiptShowTill,
    receiptShowTender: s.receiptShowTender ?? settings.receiptShowTender,
    receiptShowChange: s.receiptShowChange ?? settings.receiptShowChange,
    receiptShowLoyalty: s.receiptShowLoyalty ?? settings.receiptShowLoyalty,
    receiptShowLoyaltyBalance: s.receiptShowLoyaltyBalance ?? settings.receiptShowLoyaltyBalance,
    receiptShowLoyaltyRedeemed: s.receiptShowLoyaltyRedeemed ?? settings.receiptShowLoyaltyRedeemed,
    receiptShowLoyaltyEarned: s.receiptShowLoyaltyEarned ?? settings.receiptShowLoyaltyEarned,
    receiptShowGiftCard: s.receiptShowGiftCard ?? settings.receiptShowGiftCard,
    receiptShowGiftCardBalance: s.receiptShowGiftCardBalance ?? settings.receiptShowGiftCardBalance,
    receiptShowTitle: s.receiptShowTitle ?? settings.receiptShowTitle,
    receiptShowAddress: s.receiptShowAddress ?? settings.receiptShowAddress,
    receiptShowEmail: s.receiptShowEmail ?? settings.receiptShowEmail,
    receiptShowPhone: s.receiptShowPhone ?? settings.receiptShowPhone,
    receiptShowHeader: s.receiptShowHeader ?? settings.receiptShowHeader,
    receiptShowFooter: s.receiptShowFooter ?? settings.receiptShowFooter,
    receiptShowDiscount: s.receiptShowDiscount ?? settings.receiptShowDiscount,
    receiptShowPoweredBy: s.receiptShowPoweredBy ?? settings.receiptShowPoweredBy,
    receiptShowLogo: s.receiptShowLogo ?? settings.receiptShowLogo,
  };
}
