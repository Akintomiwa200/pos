import { BadRequestException } from "@nestjs/common";
import type { HqOrgSettings } from "./setup.types";

const RECEIPT_TEMPLATES = new Set(["classic", "compact", "bold", "minimal"]);
const INVOICE_TEMPLATES = new Set([
  "modern",
  "letterhead",
  "classic",
  "sapphire",
  "ivory",
]);
const UI_THEMES = new Set(["system", "light", "dark"]);
const UI_FONTS = new Set([
  "inter",
  "dm-sans",
  "source-sans",
  "ibm-plex",
  "nunito",
  "outfit",
  "manrope",
  "space-grotesk",
]);
const UI_ACCENTS = new Set(["violet", "teal", "blue", "amber", "rose"]);
const UI_DENSITIES = new Set(["comfortable", "compact"]);

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const CURRENCY = /^[A-Z]{3}$/;
const LANGUAGE = /^[a-z]{2}(-[A-Za-z]{2})?$/;
const INVOICE_PREFIX = /^[A-Za-z0-9_-]{1,12}$/;

export type SettingsFieldError = { field: keyof HqOrgSettings; message: string };

function asTrimmed(value: unknown) {
  return String(value ?? "").trim();
}

function requireBoolean(
  field: keyof HqOrgSettings,
  value: unknown,
  errors: SettingsFieldError[],
): boolean | undefined {
  if (typeof value !== "boolean") {
    errors.push({ field, message: `${String(field)} must be true or false` });
    return undefined;
  }
  return value;
}

function requireIntInRange(
  field: keyof HqOrgSettings,
  value: unknown,
  min: number,
  max: number,
  errors: SettingsFieldError[],
  label: string,
): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    errors.push({ field, message: `${label} must be a whole number` });
    return undefined;
  }
  if (n < min || n > max) {
    errors.push({ field, message: `${label} must be between ${min} and ${max}` });
    return undefined;
  }
  return n;
}

function requireColor(
  field: keyof HqOrgSettings,
  value: unknown,
  errors: SettingsFieldError[],
  label: string,
): string | undefined {
  const color = asTrimmed(value);
  if (!HEX_COLOR.test(color)) {
    errors.push({ field, message: `${label} must be a hex colour (e.g. #0F2C59)` });
    return undefined;
  }
  return color.toUpperCase();
}

/** Validate only keys present on the patch. Returns sanitized values + field errors. */
export function validateOrgSettingsInput(
  input: Partial<HqOrgSettings>,
): { data: Partial<HqOrgSettings>; errors: SettingsFieldError[] } {
  const errors: SettingsFieldError[] = [];
  const data: Partial<HqOrgSettings> = {};

  if (input.timezone !== undefined) {
    const timezone = asTrimmed(input.timezone);
    if (!timezone || timezone.length > 64) {
      errors.push({ field: "timezone", message: "Timezone is required (max 64 characters)" });
    } else data.timezone = timezone;
  }

  if (input.language !== undefined) {
    const language = asTrimmed(input.language);
    if (!LANGUAGE.test(language)) {
      errors.push({
        field: "language",
        message: "Language must look like en or en-NG",
      });
    } else data.language = language;
  }

  if (input.currency !== undefined) {
    const currency = asTrimmed(input.currency).toUpperCase();
    if (!CURRENCY.test(currency)) {
      errors.push({
        field: "currency",
        message: "Currency must be a 3-letter ISO code (e.g. NGN)",
      });
    } else data.currency = currency;
  }

  if (input.receiptHeader !== undefined) {
    const receiptHeader = String(input.receiptHeader);
    if (receiptHeader.length > 500) {
      errors.push({ field: "receiptHeader", message: "Header note must be 500 characters or fewer" });
    } else data.receiptHeader = receiptHeader;
  }

  if (input.receiptFooter !== undefined) {
    const receiptFooter = String(input.receiptFooter);
    if (receiptFooter.length > 500) {
      errors.push({ field: "receiptFooter", message: "Footer message must be 500 characters or fewer" });
    } else data.receiptFooter = receiptFooter;
  }

  if (input.receiptPaper !== undefined) {
    if (input.receiptPaper !== "58mm" && input.receiptPaper !== "80mm") {
      errors.push({ field: "receiptPaper", message: "Paper width must be 58mm or 80mm" });
    } else data.receiptPaper = input.receiptPaper;
  }

  if (input.receiptTemplate !== undefined) {
    if (!RECEIPT_TEMPLATES.has(String(input.receiptTemplate))) {
      errors.push({ field: "receiptTemplate", message: "Choose a valid receipt template" });
    } else data.receiptTemplate = input.receiptTemplate as HqOrgSettings["receiptTemplate"];
  }

  if (input.receiptBrandColor !== undefined) {
    const color = requireColor("receiptBrandColor", input.receiptBrandColor, errors, "Receipt brand colour");
    if (color) data.receiptBrandColor = color;
  }

  if (input.receiptTitle !== undefined) {
    const receiptTitle = asTrimmed(input.receiptTitle);
    if (receiptTitle.length > 80) {
      errors.push({
        field: "receiptTitle",
        message: "Receipt title must be 80 characters or fewer",
      });
    } else data.receiptTitle = receiptTitle;
  }

  if (input.receiptAddress !== undefined) {
    const receiptAddress = String(input.receiptAddress);
    if (receiptAddress.length > 200) {
      errors.push({
        field: "receiptAddress",
        message: "Branch address must be 200 characters or fewer",
      });
    } else data.receiptAddress = receiptAddress;
  }

  if (input.receiptEmail !== undefined) {
    const receiptEmail = asTrimmed(input.receiptEmail);
    if (receiptEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail)) {
      errors.push({ field: "receiptEmail", message: "Enter a valid receipt email" });
    } else if (receiptEmail.length > 120) {
      errors.push({ field: "receiptEmail", message: "Receipt email must be 120 characters or fewer" });
    } else data.receiptEmail = receiptEmail;
  }

  if (input.receiptBarcodeValue !== undefined) {
    const receiptBarcodeValue = asTrimmed(input.receiptBarcodeValue);
    if (!/^[A-Za-z0-9-]{4,32}$/.test(receiptBarcodeValue)) {
      errors.push({
        field: "receiptBarcodeValue",
        message: "Barcode value must be 4–32 letters, numbers, or hyphens",
      });
    } else data.receiptBarcodeValue = receiptBarcodeValue;
  }

  if (input.invoicePrefix !== undefined) {
    const invoicePrefix = asTrimmed(input.invoicePrefix).toUpperCase();
    if (!INVOICE_PREFIX.test(invoicePrefix)) {
      errors.push({
        field: "invoicePrefix",
        message: "Invoice prefix must be 1–12 letters, numbers, _ or -",
      });
    } else data.invoicePrefix = invoicePrefix;
  }

  if (input.invoiceNextNumber !== undefined) {
    const n = requireIntInRange(
      "invoiceNextNumber",
      input.invoiceNextNumber,
      1,
      999_999_999,
      errors,
      "Next invoice number",
    );
    if (n !== undefined) data.invoiceNextNumber = n;
  }

  if (input.invoiceTemplate !== undefined) {
    if (!INVOICE_TEMPLATES.has(String(input.invoiceTemplate))) {
      errors.push({ field: "invoiceTemplate", message: "Choose a valid invoice template" });
    } else data.invoiceTemplate = input.invoiceTemplate as HqOrgSettings["invoiceTemplate"];
  }

  if (input.invoiceBrandColor !== undefined) {
    const color = requireColor("invoiceBrandColor", input.invoiceBrandColor, errors, "Invoice brand colour");
    if (color) data.invoiceBrandColor = color;
  }

  if (input.invoicePanelColor !== undefined) {
    const color = requireColor("invoicePanelColor", input.invoicePanelColor, errors, "Invoice panel colour");
    if (color) data.invoicePanelColor = color;
  }

  if (input.invoiceTerms !== undefined) {
    const invoiceTerms = String(input.invoiceTerms);
    if (invoiceTerms.length > 2000) {
      errors.push({ field: "invoiceTerms", message: "Terms must be 2000 characters or fewer" });
    } else data.invoiceTerms = invoiceTerms;
  }

  if (input.invoicePaymentNote !== undefined) {
    const invoicePaymentNote = String(input.invoicePaymentNote);
    if (invoicePaymentNote.length > 500) {
      errors.push({
        field: "invoicePaymentNote",
        message: "Payment note must be 500 characters or fewer",
      });
    } else data.invoicePaymentNote = invoicePaymentNote;
  }

  if (input.idleLockMinutes !== undefined) {
    const n = requireIntInRange("idleLockMinutes", input.idleLockMinutes, 0, 240, errors, "Idle lock");
    if (n !== undefined) data.idleLockMinutes = n;
  }

  if (input.lowStockQty !== undefined) {
    const n = requireIntInRange("lowStockQty", input.lowStockQty, 0, 1_000_000, errors, "Low stock quantity");
    if (n !== undefined) data.lowStockQty = n;
  }

  if (input.maxDiscountPercent !== undefined) {
    const n = typeof input.maxDiscountPercent === "number"
      ? input.maxDiscountPercent
      : Number(input.maxDiscountPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      errors.push({
        field: "maxDiscountPercent",
        message: "Max discount must be between 0 and 100",
      });
    } else data.maxDiscountPercent = Math.round(n * 100) / 100;
  }

  if (input.holdExpiryMinutes !== undefined) {
    const n = requireIntInRange(
      "holdExpiryMinutes",
      input.holdExpiryMinutes,
      0,
      10_080,
      errors,
      "Hold expiry",
    );
    if (n !== undefined) data.holdExpiryMinutes = n;
  }

  if (input.receiptCopies !== undefined) {
    const n = requireIntInRange("receiptCopies", input.receiptCopies, 1, 5, errors, "Receipt copies");
    if (n !== undefined) data.receiptCopies = n;
  }

  if (input.passwordMinLength !== undefined) {
    const n = requireIntInRange(
      "passwordMinLength",
      input.passwordMinLength,
      6,
      32,
      errors,
      "Minimum password length",
    );
    if (n !== undefined) data.passwordMinLength = n;
  }

  if (input.sessionTimeoutMinutes !== undefined) {
    const n = requireIntInRange(
      "sessionTimeoutMinutes",
      input.sessionTimeoutMinutes,
      0,
      10_080,
      errors,
      "Session timeout",
    );
    if (n !== undefined) data.sessionTimeoutMinutes = n;
  }

  if (input.uiTheme !== undefined) {
    if (!UI_THEMES.has(String(input.uiTheme))) {
      errors.push({ field: "uiTheme", message: "Theme must be system, light, or dark" });
    } else data.uiTheme = input.uiTheme as HqOrgSettings["uiTheme"];
  }

  if (input.uiFont !== undefined) {
    if (!UI_FONTS.has(String(input.uiFont))) {
      errors.push({ field: "uiFont", message: "Choose a supported font" });
    } else data.uiFont = input.uiFont as HqOrgSettings["uiFont"];
  }

  if (input.uiAccent !== undefined) {
    if (!UI_ACCENTS.has(String(input.uiAccent))) {
      errors.push({ field: "uiAccent", message: "Choose a supported accent colour" });
    } else data.uiAccent = input.uiAccent as HqOrgSettings["uiAccent"];
  }

  if (input.uiDensity !== undefined) {
    if (!UI_DENSITIES.has(String(input.uiDensity))) {
      errors.push({ field: "uiDensity", message: "Density must be comfortable or compact" });
    } else data.uiDensity = input.uiDensity as HqOrgSettings["uiDensity"];
  }

  const boolFields: (keyof HqOrgSettings)[] = [
    "receiptShowLogo",
    "receiptShowTax",
    "receiptShowCashier",
    "receiptShowBarcode",
    "receiptShowPoweredBy",
    "receiptShowTicketNumber",
    "receiptShowDate",
    "receiptShowCustomer",
    "receiptShowTill",
    "receiptShowTender",
    "receiptShowChange",
    "receiptShowLoyalty",
    "receiptShowGiftCard",
    "invoiceShowLogo",
    "pricesIncludeVat",
    "requireOpenShift",
    "blockNegativeStock",
    "printDuplicateReceipt",
    "showSkuOnReceipt",
    "allowPriceOverride",
    "requireManagerPin",
    "allowDiscounts",
    "allowPartialRefunds",
    "restockOnRefund",
    "refundWithoutTicket",
    "tipsEnabled",
    "autoPrintReceipt",
    "openCashDrawer",
    "notifyLowStock",
    "notifyNewSale",
    "notifyRefund",
    "notifyShiftClose",
    "notifyDailySummary",
    "uiReduceMotion",
  ];

  for (const field of boolFields) {
    if (input[field] !== undefined) {
      const value = requireBoolean(field, input[field], errors);
      if (value !== undefined) (data as Record<string, unknown>)[field] = value;
    }
  }

  return { data, errors };
}

export function assertOrgSettingsInput(input: Partial<HqOrgSettings>): Partial<HqOrgSettings> {
  const { data, errors } = validateOrgSettingsInput(input);
  if (errors.length) {
    throw new BadRequestException(errors.map((row) => row.message));
  }
  return data;
}
