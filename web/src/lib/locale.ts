export const DEFAULT_TIMEZONE = "Africa/Lagos";
export const DEFAULT_LANGUAGE = "en-NG";
export const DEFAULT_CURRENCY = "NGN";

export const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Abidjan",
  "Africa/Porto-Novo",
  "Africa/Lome",
  "Africa/Ouagadougou",
  "Africa/Niamey",
  "Africa/Dakar",
  "Africa/Bamako",
  "Africa/Conakry",
  "Africa/Freetown",
  "Africa/Monrovia",
  "Africa/Nouakchott",
  "Africa/Banjul",
  "Africa/Bissau",
  "Africa/Douala",
  "Africa/Libreville",
  "Africa/Malabo",
  "Africa/Brazzaville",
  "Africa/Kinshasa",
  "Africa/Lubumbashi",
  "Africa/Bangui",
  "Africa/Ndjamena",
  "Africa/Sao_Tome",
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Kigali",
  "Africa/Dar_es_Salaam",
  "Africa/Addis_Ababa",
  "Africa/Mogadishu",
  "Africa/Djibouti",
  "Africa/Khartoum",
  "Africa/Juba",
  "Africa/Cairo",
  "Africa/Tripoli",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Casablanca",
  "Africa/El_Aaiun",
  "Africa/Johannesburg",
  "Africa/Maputo",
  "Africa/Harare",
  "Africa/Lusaka",
  "Africa/Gaborone",
  "Africa/Windhoek",
  "Africa/Maseru",
  "Africa/Mbabane",
  "Africa/Blantyre",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
];

export function listTimezones() {
  return [...new Set(TIMEZONES)];
}

export const LANGUAGES: { value: string; label: string }[] = [
  { value: "en-NG", label: "English (Nigeria)" },
  { value: "ha-NG", label: "Hausa (Nigeria)" },
  { value: "yo-NG", label: "Yoruba (Nigeria)" },
  { value: "ig-NG", label: "Igbo (Nigeria)" },
  { value: "en-GH", label: "English (Ghana)" },
  { value: "en-KE", label: "English (Kenya)" },
  { value: "en-ZA", label: "English (South Africa)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-US", label: "English (United States)" },
  { value: "fr-CI", label: "French (Côte d'Ivoire)" },
  { value: "fr-TG", label: "French (Togo)" },
  { value: "fr-SN", label: "French (Senegal)" },
  { value: "fr-CM", label: "French (Cameroon)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "ar-EG", label: "Arabic (Egypt)" },
  { value: "ar-AE", label: "Arabic (UAE)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
];

export const CURRENCIES: { value: string; label: string }[] = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "ZAR", label: "ZAR — South African Rand" },
  { value: "UGX", label: "UGX — Ugandan Shilling" },
  { value: "TZS", label: "TZS — Tanzanian Shilling" },
  { value: "XOF", label: "XOF — West African CFA franc" },
  { value: "XAF", label: "XAF — Central African CFA franc" },
  { value: "EGP", label: "EGP — Egyptian Pound" },
  { value: "MAD", label: "MAD — Moroccan Dirham" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CNY", label: "CNY — Chinese Yuan" },
];

export type LocaleTriple = {
  timezone: string;
  language: string;
  currency: string;
};

const NG_LANGUAGES = new Set(["en-NG", "ha-NG", "yo-NG", "ig-NG"]);

/** Canonical language + currency for every timezone in the picker. */
const TIMEZONE_LOCALE: Record<string, { language: string; currency: string }> = {
  "Africa/Lagos": { language: "en-NG", currency: "NGN" },
  "Africa/Accra": { language: "en-GH", currency: "GHS" },
  "Africa/Abidjan": { language: "fr-CI", currency: "XOF" },
  "Africa/Porto-Novo": { language: "fr", currency: "XOF" },
  "Africa/Lome": { language: "fr-TG", currency: "XOF" },
  "Africa/Ouagadougou": { language: "fr", currency: "XOF" },
  "Africa/Niamey": { language: "fr", currency: "XOF" },
  "Africa/Dakar": { language: "fr-SN", currency: "XOF" },
  "Africa/Bamako": { language: "fr", currency: "XOF" },
  "Africa/Conakry": { language: "fr", currency: "XOF" },
  "Africa/Freetown": { language: "en", currency: "USD" },
  "Africa/Monrovia": { language: "en", currency: "USD" },
  "Africa/Nouakchott": { language: "fr", currency: "MAD" },
  "Africa/Banjul": { language: "en", currency: "USD" },
  "Africa/Bissau": { language: "fr", currency: "XOF" },
  "Africa/Douala": { language: "fr-CM", currency: "XAF" },
  "Africa/Libreville": { language: "fr", currency: "XAF" },
  "Africa/Malabo": { language: "fr", currency: "XAF" },
  "Africa/Brazzaville": { language: "fr", currency: "XAF" },
  "Africa/Kinshasa": { language: "fr", currency: "USD" },
  "Africa/Lubumbashi": { language: "fr", currency: "USD" },
  "Africa/Bangui": { language: "fr", currency: "XAF" },
  "Africa/Ndjamena": { language: "fr", currency: "XAF" },
  "Africa/Sao_Tome": { language: "fr", currency: "XAF" },
  "Africa/Nairobi": { language: "en-KE", currency: "KES" },
  "Africa/Kampala": { language: "en", currency: "UGX" },
  "Africa/Kigali": { language: "en", currency: "KES" },
  "Africa/Dar_es_Salaam": { language: "en", currency: "TZS" },
  "Africa/Addis_Ababa": { language: "en", currency: "KES" },
  "Africa/Mogadishu": { language: "en", currency: "USD" },
  "Africa/Djibouti": { language: "fr", currency: "USD" },
  "Africa/Khartoum": { language: "ar-EG", currency: "EGP" },
  "Africa/Juba": { language: "en", currency: "UGX" },
  "Africa/Cairo": { language: "ar-EG", currency: "EGP" },
  "Africa/Tripoli": { language: "ar-EG", currency: "EGP" },
  "Africa/Tunis": { language: "fr", currency: "EUR" },
  "Africa/Algiers": { language: "fr", currency: "EUR" },
  "Africa/Casablanca": { language: "fr", currency: "MAD" },
  "Africa/El_Aaiun": { language: "fr", currency: "MAD" },
  "Africa/Johannesburg": { language: "en-ZA", currency: "ZAR" },
  "Africa/Maputo": { language: "en", currency: "ZAR" },
  "Africa/Harare": { language: "en", currency: "USD" },
  "Africa/Lusaka": { language: "en", currency: "ZAR" },
  "Africa/Gaborone": { language: "en", currency: "ZAR" },
  "Africa/Windhoek": { language: "en", currency: "ZAR" },
  "Africa/Maseru": { language: "en", currency: "ZAR" },
  "Africa/Mbabane": { language: "en", currency: "ZAR" },
  "Africa/Blantyre": { language: "en", currency: "ZAR" },
  UTC: { language: "en", currency: "USD" },
  "Europe/London": { language: "en-GB", currency: "GBP" },
  "Europe/Paris": { language: "fr-FR", currency: "EUR" },
  "Europe/Berlin": { language: "de-DE", currency: "EUR" },
  "Europe/Amsterdam": { language: "en", currency: "EUR" },
  "Asia/Dubai": { language: "ar-AE", currency: "AED" },
  "Asia/Riyadh": { language: "ar-AE", currency: "AED" },
  "Asia/Kolkata": { language: "hi-IN", currency: "INR" },
  "Asia/Shanghai": { language: "en", currency: "CNY" },
  "America/New_York": { language: "en-US", currency: "USD" },
  "America/Chicago": { language: "en-US", currency: "USD" },
  "America/Denver": { language: "en-US", currency: "USD" },
  "America/Los_Angeles": { language: "en-US", currency: "USD" },
  "America/Toronto": { language: "en", currency: "CAD" },
  "Australia/Sydney": { language: "en", currency: "AUD" },
};

const LANGUAGE_LOCALE: Record<string, { timezone: string; currency: string }> = {
  "en-NG": { timezone: "Africa/Lagos", currency: "NGN" },
  "ha-NG": { timezone: "Africa/Lagos", currency: "NGN" },
  "yo-NG": { timezone: "Africa/Lagos", currency: "NGN" },
  "ig-NG": { timezone: "Africa/Lagos", currency: "NGN" },
  "en-GH": { timezone: "Africa/Accra", currency: "GHS" },
  "en-KE": { timezone: "Africa/Nairobi", currency: "KES" },
  "en-ZA": { timezone: "Africa/Johannesburg", currency: "ZAR" },
  "en-GB": { timezone: "Europe/London", currency: "GBP" },
  "en-US": { timezone: "America/New_York", currency: "USD" },
  "fr-CI": { timezone: "Africa/Abidjan", currency: "XOF" },
  "fr-TG": { timezone: "Africa/Lome", currency: "XOF" },
  "fr-SN": { timezone: "Africa/Dakar", currency: "XOF" },
  "fr-CM": { timezone: "Africa/Douala", currency: "XAF" },
  "fr-FR": { timezone: "Europe/Paris", currency: "EUR" },
  "ar-EG": { timezone: "Africa/Cairo", currency: "EGP" },
  "ar-AE": { timezone: "Asia/Dubai", currency: "AED" },
  "de-DE": { timezone: "Europe/Berlin", currency: "EUR" },
  "hi-IN": { timezone: "Asia/Kolkata", currency: "INR" },
  en: { timezone: "Africa/Lagos", currency: "NGN" },
  fr: { timezone: "Africa/Abidjan", currency: "XOF" },
};

const CURRENCY_LOCALE: Record<string, { timezone: string; language: string }> = {
  NGN: { timezone: "Africa/Lagos", language: "en-NG" },
  GHS: { timezone: "Africa/Accra", language: "en-GH" },
  KES: { timezone: "Africa/Nairobi", language: "en-KE" },
  ZAR: { timezone: "Africa/Johannesburg", language: "en-ZA" },
  UGX: { timezone: "Africa/Kampala", language: "en" },
  TZS: { timezone: "Africa/Dar_es_Salaam", language: "en" },
  XOF: { timezone: "Africa/Abidjan", language: "fr-CI" },
  XAF: { timezone: "Africa/Douala", language: "fr-CM" },
  EGP: { timezone: "Africa/Cairo", language: "ar-EG" },
  MAD: { timezone: "Africa/Casablanca", language: "fr" },
  AED: { timezone: "Asia/Dubai", language: "ar-AE" },
  USD: { timezone: "America/New_York", language: "en-US" },
  GBP: { timezone: "Europe/London", language: "en-GB" },
  EUR: { timezone: "Europe/Paris", language: "fr-FR" },
  CAD: { timezone: "America/Toronto", language: "en" },
  INR: { timezone: "Asia/Kolkata", language: "hi-IN" },
  AUD: { timezone: "Australia/Sydney", language: "en" },
  CNY: { timezone: "Asia/Shanghai", language: "en" },
};

const COUNTRY_LOCALE: Record<string, LocaleTriple> = {
  Nigeria: { timezone: "Africa/Lagos", language: "en-NG", currency: "NGN" },
  Ghana: { timezone: "Africa/Accra", language: "en-GH", currency: "GHS" },
  Kenya: { timezone: "Africa/Nairobi", language: "en-KE", currency: "KES" },
  "South Africa": { timezone: "Africa/Johannesburg", language: "en-ZA", currency: "ZAR" },
  Uganda: { timezone: "Africa/Kampala", language: "en", currency: "UGX" },
  Tanzania: { timezone: "Africa/Dar_es_Salaam", language: "en", currency: "TZS" },
  Benin: { timezone: "Africa/Porto-Novo", language: "fr", currency: "XOF" },
  Togo: { timezone: "Africa/Lome", language: "fr-TG", currency: "XOF" },
  "Côte d'Ivoire": { timezone: "Africa/Abidjan", language: "fr-CI", currency: "XOF" },
  Senegal: { timezone: "Africa/Dakar", language: "fr-SN", currency: "XOF" },
  Cameroon: { timezone: "Africa/Douala", language: "fr-CM", currency: "XAF" },
  Egypt: { timezone: "Africa/Cairo", language: "ar-EG", currency: "EGP" },
  UAE: { timezone: "Asia/Dubai", language: "ar-AE", currency: "AED" },
  "United Kingdom": { timezone: "Europe/London", language: "en-GB", currency: "GBP" },
  "United States": { timezone: "America/New_York", language: "en-US", currency: "USD" },
  Canada: { timezone: "America/Toronto", language: "en", currency: "CAD" },
  India: { timezone: "Asia/Kolkata", language: "hi-IN", currency: "INR" },
  Germany: { timezone: "Europe/Berlin", language: "de-DE", currency: "EUR" },
  France: { timezone: "Europe/Paris", language: "fr-FR", currency: "EUR" },
  Australia: { timezone: "Australia/Sydney", language: "en", currency: "AUD" },
};

export function withCurrent<T extends { value: string }>(list: T[], current: string): T[] {
  const value = current?.trim();
  if (!value || list.some((row) => row.value === value)) return list;
  return [{ value, label: value } as T, ...list];
}

export function withCurrentValue(list: string[], current: string) {
  const value = current?.trim();
  if (!value || list.includes(value)) return list;
  return [value, ...list];
}

export function localeForCountry(country: string): LocaleTriple {
  return (
    COUNTRY_LOCALE[country] || {
      timezone: DEFAULT_TIMEZONE,
      language: DEFAULT_LANGUAGE,
      currency: DEFAULT_CURRENCY,
    }
  );
}

export function currencyForCountry(country: string) {
  return localeForCountry(country).currency;
}

function tripleFromTimezone(timezone: string, language: string, currency: string): LocaleTriple {
  return { timezone, language, currency };
}

export function localeFromTimezone(
  timezone: string,
  current?: Partial<LocaleTriple>,
): LocaleTriple {
  const row = TIMEZONE_LOCALE[timezone];
  if (!row) {
    return tripleFromTimezone(
      timezone,
      current?.language || DEFAULT_LANGUAGE,
      current?.currency || DEFAULT_CURRENCY,
    );
  }
  if (row.currency === "NGN" && current?.language && NG_LANGUAGES.has(current.language)) {
    return tripleFromTimezone(timezone, current.language, "NGN");
  }
  return tripleFromTimezone(timezone, row.language, row.currency);
}

export function localeFromLanguage(
  language: string,
  current?: Partial<LocaleTriple>,
): LocaleTriple {
  const row = LANGUAGE_LOCALE[language];
  if (!row) {
    return tripleFromTimezone(
      current?.timezone || DEFAULT_TIMEZONE,
      language,
      current?.currency || DEFAULT_CURRENCY,
    );
  }
  if (current?.timezone && TIMEZONE_LOCALE[current.timezone]?.currency === row.currency) {
    return tripleFromTimezone(current.timezone, language, row.currency);
  }
  return tripleFromTimezone(row.timezone, language, row.currency);
}

export function localeFromCurrency(
  currency: string,
  current?: Partial<LocaleTriple>,
): LocaleTriple {
  const code = currency.trim().toUpperCase();
  const row = CURRENCY_LOCALE[code];
  if (!row) {
    return tripleFromTimezone(
      current?.timezone || DEFAULT_TIMEZONE,
      current?.language || DEFAULT_LANGUAGE,
      code || DEFAULT_CURRENCY,
    );
  }
  if (current?.timezone && TIMEZONE_LOCALE[current.timezone]?.currency === code) {
    return localeFromTimezone(current.timezone, { ...current, currency: code });
  }
  return tripleFromTimezone(row.timezone, row.language, code);
}
