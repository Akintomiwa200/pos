import type { HqOrgSettings } from "@/lib/hq-setup";

export type SettingsFieldErrors = Partial<Record<keyof HqOrgSettings, string>>;

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

function intInRange(value: unknown, min: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
}

/** Full-draft validation for Settings forms (mirrors backend rules). */
export function validateOrgSettings(draft: HqOrgSettings): SettingsFieldErrors {
  const errors: SettingsFieldErrors = {};

  const timezone = draft.timezone.trim();
  if (!timezone || timezone.length > 64) {
    errors.timezone = "Timezone is required (max 64 characters)";
  }

  const language = draft.language.trim();
  if (!LANGUAGE.test(language)) {
    errors.language = "Language must look like en or en-NG";
  }

  const currency = draft.currency.trim().toUpperCase();
  if (!CURRENCY.test(currency)) {
    errors.currency = "Currency must be a 3-letter ISO code (e.g. NGN)";
  }

  if (draft.receiptHeader.length > 500) {
    errors.receiptHeader = "Header note must be 500 characters or fewer";
  }
  if (draft.receiptFooter.length > 500) {
    errors.receiptFooter = "Footer message must be 500 characters or fewer";
  }
  if (draft.receiptPaper !== "58mm" && draft.receiptPaper !== "80mm") {
    errors.receiptPaper = "Paper width must be 58mm or 80mm";
  }
  if (!RECEIPT_TEMPLATES.has(draft.receiptTemplate)) {
    errors.receiptTemplate = "Choose a valid receipt template";
  }
  if (!HEX_COLOR.test(draft.receiptBrandColor.trim())) {
    errors.receiptBrandColor = "Receipt brand colour must be a hex colour (e.g. #111827)";
  }

  const receiptTitle = (draft.receiptTitle ?? "").trim();
  if (receiptTitle.length > 80) {
    errors.receiptTitle = "Receipt title must be 80 characters or fewer";
  }
  if ((draft.receiptAddress ?? "").length > 200) {
    errors.receiptAddress = "Branch address must be 200 characters or fewer";
  }
  const receiptEmail = (draft.receiptEmail ?? "").trim();
  if (receiptEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail)) {
    errors.receiptEmail = "Enter a valid receipt email";
  } else if (receiptEmail.length > 120) {
    errors.receiptEmail = "Receipt email must be 120 characters or fewer";
  }
  const barcode = (draft.receiptBarcodeValue ?? "").trim();
  if (!/^[A-Za-z0-9-]{4,32}$/.test(barcode)) {
    errors.receiptBarcodeValue = "Barcode value must be 4–32 letters, numbers, or hyphens";
  }

  const invoicePrefix = draft.invoicePrefix.trim();
  if (!INVOICE_PREFIX.test(invoicePrefix)) {
    errors.invoicePrefix = "Invoice prefix must be 1–12 letters, numbers, _ or -";
  }
  if (!intInRange(draft.invoiceNextNumber, 1, 999_999_999)) {
    errors.invoiceNextNumber = "Next invoice number must be between 1 and 999999999";
  }
  if (!INVOICE_TEMPLATES.has(draft.invoiceTemplate)) {
    errors.invoiceTemplate = "Choose a valid invoice template";
  }
  if (!HEX_COLOR.test(draft.invoiceBrandColor.trim())) {
    errors.invoiceBrandColor = "Invoice brand colour must be a hex colour (e.g. #0F2C59)";
  }
  if (!HEX_COLOR.test(draft.invoicePanelColor.trim())) {
    errors.invoicePanelColor = "Invoice panel colour must be a hex colour (e.g. #5788D3)";
  }
  if (draft.invoiceTerms.length > 2000) {
    errors.invoiceTerms = "Terms must be 2000 characters or fewer";
  }
  if (draft.invoicePaymentNote.length > 500) {
    errors.invoicePaymentNote = "Payment note must be 500 characters or fewer";
  }

  if (!intInRange(draft.idleLockMinutes, 0, 240)) {
    errors.idleLockMinutes = "Idle lock must be between 0 and 240 minutes";
  }
  if (!intInRange(draft.lowStockQty, 0, 1_000_000)) {
    errors.lowStockQty = "Low stock quantity must be 0 or more";
  }
  if (
    !Number.isFinite(draft.maxDiscountPercent) ||
    draft.maxDiscountPercent < 0 ||
    draft.maxDiscountPercent > 100
  ) {
    errors.maxDiscountPercent = "Max discount must be between 0 and 100";
  }
  if (!intInRange(draft.holdExpiryMinutes, 0, 10_080)) {
    errors.holdExpiryMinutes = "Hold expiry must be between 0 and 10080 minutes";
  }
  if (!intInRange(draft.receiptCopies, 1, 5)) {
    errors.receiptCopies = "Receipt copies must be between 1 and 5";
  }
  if (!intInRange(draft.passwordMinLength, 6, 32)) {
    errors.passwordMinLength = "Minimum password length must be between 6 and 32";
  }
  if (!intInRange(draft.sessionTimeoutMinutes, 0, 10_080)) {
    errors.sessionTimeoutMinutes = "Session timeout must be between 0 and 10080 minutes";
  }

  if (!UI_THEMES.has(draft.uiTheme)) errors.uiTheme = "Theme must be system, light, or dark";
  if (!UI_FONTS.has(draft.uiFont)) errors.uiFont = "Choose a supported font";
  if (!UI_ACCENTS.has(draft.uiAccent)) errors.uiAccent = "Choose a supported accent colour";
  if (!UI_DENSITIES.has(draft.uiDensity)) {
    errors.uiDensity = "Density must be comfortable or compact";
  }

  return errors;
}

export function firstSettingsError(errors: SettingsFieldErrors) {
  for (const value of Object.values(errors)) {
    if (value) return value;
  }
  return null;
}

export function settingsFieldClass(base: string, error?: string) {
  return error
    ? `${base} !border-pos-danger/70 ring-2 ring-pos-danger/20 focus:!border-pos-danger`
    : base;
}
