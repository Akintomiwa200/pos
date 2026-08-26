"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCompany,
  getOrgSettings,
  saveOrgSettings,
  type HqCompany,
  type HqOrgSettings,
} from "@/lib/hq-setup";
import {
  DEFAULT_APPEARANCE,
  isUiAccent,
  isUiDensity,
  isUiFont,
  type AppearancePrefs,
  type ThemePreference,
  isThemePreference,
} from "@/lib/appearance";
import { setOrgLocale } from "@/lib/org-locale";

export type SettingsLiveEvent = {
  type: "settings";
  settings: HqOrgSettings;
  at: string;
};

const SETTINGS_DEFAULTS: HqOrgSettings = {
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
  invoiceTerms:
    "Payment is due within 7 days. Goods remain property of the seller until paid in full.",
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

export function normalizeSettings(
  raw: Partial<HqOrgSettings> | null | undefined,
): HqOrgSettings {
  return { ...SETTINGS_DEFAULTS, ...raw };
}

export function appearanceFromSettings(settings: HqOrgSettings): AppearancePrefs & {
  theme: ThemePreference;
} {
  return {
    theme: isThemePreference(settings.uiTheme) ? settings.uiTheme : "system",
    font: isUiFont(settings.uiFont) ? settings.uiFont : DEFAULT_APPEARANCE.font,
    accent: isUiAccent(settings.uiAccent) ? settings.uiAccent : DEFAULT_APPEARANCE.accent,
    density: isUiDensity(settings.uiDensity) ? settings.uiDensity : DEFAULT_APPEARANCE.density,
    reduceMotion: Boolean(settings.uiReduceMotion),
  };
}

export function settingsPatchFromAppearance(prefs: {
  theme: ThemePreference;
  font: AppearancePrefs["font"];
  accent: AppearancePrefs["accent"];
  density: AppearancePrefs["density"];
  reduceMotion: boolean;
}): Partial<HqOrgSettings> {
  return {
    uiTheme: prefs.theme,
    uiFont: prefs.font,
    uiAccent: prefs.accent,
    uiDensity: prefs.density,
    uiReduceMotion: prefs.reduceMotion,
  };
}

/** Debounced POST to HQ settings — real backend persistence. */
export function createSettingsSaver(debounceMs = 450) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: Partial<HqOrgSettings> = {};
  let waiters: Array<{
    resolve: (value: HqOrgSettings) => void;
    reject: (reason: unknown) => void;
  }> = [];
  let inflight: Promise<HqOrgSettings> | null = null;

  function run() {
    const body = latest;
    latest = {};
    const current = waiters;
    waiters = [];
    inflight = saveOrgSettings(body)
      .then((saved) => {
        const normalized = normalizeSettings(saved);
        current.forEach((waiter) => waiter.resolve(normalized));
        return normalized;
      })
      .catch((err) => {
        current.forEach((waiter) => waiter.reject(err));
        throw err;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  return {
    push(partial: Partial<HqOrgSettings>) {
      latest = { ...latest, ...partial };
      return new Promise<HqOrgSettings>((resolve, reject) => {
        waiters.push({ resolve, reject });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          void run();
        }, debounceMs);
      });
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (Object.keys(latest).length) return run();
      return inflight;
    },
  };
}

export function subscribeSettingsStream(
  onEvent: (event: SettingsLiveEvent) => void,
  onError?: (err: Event) => void,
) {
  const source = new EventSource("/api/console/setup/settings/stream");
  source.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data) as SettingsLiveEvent;
      if (parsed?.type === "settings" && parsed.settings) onEvent(parsed);
    } catch {
      /* ignore malformed frames */
    }
  };
  source.onerror = (err) => onError?.(err);
  return () => source.close();
}

/**
 * Live HQ settings + company for Settings studios.
 * - Loads from API
 * - Subscribes to SSE for multi-tab / multi-user updates
 * - Debounced save on patch
 */
export function useLiveOrgSettings() {
  const [settings, setSettings] = useState<HqOrgSettings | null>(null);
  const [company, setCompany] = useState<HqCompany | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const saver = useRef(createSettingsSaver());
  const localEditUntil = useRef(0);

  const applyRemote = useCallback((next: HqOrgSettings, at?: string) => {
    if (Date.now() < localEditUntil.current) return;
    const settings = normalizeSettings(next);
    setSettings(settings);
    setOrgLocale({
      currency: settings.currency,
      language: settings.language,
      timezone: settings.timezone,
    });
    if (at) setSyncedAt(at);
  }, []);

  const load = useCallback(async () => {
    const [next, companyRow] = await Promise.all([
      getOrgSettings(),
      getCompany().catch(() => null),
    ]);
    const settings = normalizeSettings(next);
    setSettings(settings);
    setCompany(companyRow);
    setOrgLocale({
      currency: settings.currency,
      language: settings.language,
      timezone: settings.timezone,
    });
    setSyncedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [load]);

  useEffect(() => {
    return subscribeSettingsStream((event) => {
      applyRemote(event.settings, event.at);
    });
  }, [applyRemote]);

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() < localEditUntil.current) return;
      void load().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const patch = useCallback(async (partial: Partial<HqOrgSettings>, opts?: { silent?: boolean }) => {
    localEditUntil.current = Date.now() + 1200;
    setSettings((prev) => {
      const next = normalizeSettings({ ...(prev ?? SETTINGS_DEFAULTS), ...partial });
      setOrgLocale({
        currency: next.currency,
        language: next.language,
        timezone: next.timezone,
      });
      return next;
    });
    setSaving(true);
    try {
      const saved = await saver.current.push(partial);
      setSettings(saved);
      setOrgLocale({
        currency: saved.currency,
        language: saved.language,
        timezone: saved.timezone,
      });
      setSyncedAt(new Date().toISOString());
      return saved;
    } finally {
      setSaving(false);
    }
  }, []);

  const replace = useCallback(async (next: HqOrgSettings) => {
    localEditUntil.current = Date.now() + 1200;
    setSettings(next);
    setOrgLocale({
      currency: next.currency,
      language: next.language,
      timezone: next.timezone,
    });
    setSaving(true);
    try {
      const saved = await saver.current.push(next);
      setSettings(saved);
      setOrgLocale({
        currency: saved.currency,
        language: saved.language,
        timezone: saved.timezone,
      });
      setSyncedAt(new Date().toISOString());
      return saved;
    } finally {
      setSaving(false);
    }
  }, []);

  const flush = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saver.current.flush();
      if (saved) {
        setSettings(saved);
        setSyncedAt(new Date().toISOString());
      }
      return saved ?? settings;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const setSettingsLocal = useCallback((next: HqOrgSettings) => {
    localEditUntil.current = Date.now() + 1200;
    setSettings(next);
    setOrgLocale({
      currency: next.currency,
      language: next.language,
      timezone: next.timezone,
    });
  }, []);

  return {
    ready,
    saving,
    syncedAt,
    settings,
    company,
    setCompany,
    load,
    patch,
    replace,
    flush,
    setSettingsLocal,
  };
}
