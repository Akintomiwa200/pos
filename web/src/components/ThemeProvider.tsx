"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_APPEARANCE,
  THEME_STORAGE_KEY,
  applyAppearance,
  applyTheme,
  isThemePreference,
  readAppearance,
  resolveTheme,
  writeAppearance,
  type AppearancePrefs,
  type ResolvedTheme,
  type ThemePreference,
  type UiAccent,
  type UiDensity,
  type UiFont,
} from "@/lib/appearance";
import { getOrgSettings } from "@/lib/hq-setup";
import {
  appearanceFromSettings,
  createSettingsSaver,
  normalizeSettings,
  settingsPatchFromAppearance,
  subscribeSettingsStream,
} from "@/lib/settings-live";
import { hydrateOrgLocaleFromStorage, setOrgLocale } from "@/lib/org-locale";

type AppearanceContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  appearance: AppearancePrefs;
  setFont: (font: UiFont) => void;
  setAccent: (accent: UiAccent) => void;
  setDensity: (density: UiDensity) => void;
  setReduceMotion: (value: boolean) => void;
  resetAppearance: () => void;
  hqSynced: boolean;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [appearance, setAppearance] = useState<AppearancePrefs>(DEFAULT_APPEARANCE);
  const [hqSynced, setHqSynced] = useState(false);
  const localEditUntil = useRef(0);
  const saver = useRef(createSettingsSaver(500));
  const skipRemote = useRef(false);

  const applyFromHq = useCallback((prefs: ReturnType<typeof appearanceFromSettings>) => {
    skipRemote.current = true;
    setPreferenceState(prefs.theme);
    localStorage.setItem(THEME_STORAGE_KEY, prefs.theme);
    const next: AppearancePrefs = {
      font: prefs.font,
      accent: prefs.accent,
      density: prefs.density,
      reduceMotion: prefs.reduceMotion,
    };
    writeAppearance(next);
    setAppearance(next);
    queueMicrotask(() => {
      skipRemote.current = false;
    });
  }, []);

  useEffect(() => {
    hydrateOrgLocaleFromStorage();
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(storedTheme)) setPreferenceState(storedTheme);
    setAppearance(readAppearance());

    void getOrgSettings()
      .then((raw) => {
        const settings = normalizeSettings(raw);
        applyFromHq(appearanceFromSettings(settings));
        setOrgLocale({
          currency: settings.currency,
          language: settings.language,
          timezone: settings.timezone,
        });
        setHqSynced(true);
      })
      .catch(() => {
        setHqSynced(false);
      });

    return subscribeSettingsStream((event) => {
      if (Date.now() < localEditUntil.current) return;
      const settings = normalizeSettings(event.settings);
      applyFromHq(appearanceFromSettings(settings));
      setOrgLocale({
        currency: settings.currency,
        language: settings.language,
        timezone: settings.timezone,
      });
      setHqSynced(true);
    });
  }, [applyFromHq]);

  useEffect(() => {
    const next = resolveTheme(preference);
    setResolved(next);
    applyTheme(next);
    applyAppearance(appearance, next);
  }, [preference, appearance]);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      const next = resolveTheme("system");
      setResolved(next);
      applyTheme(next);
      applyAppearance(appearance, next);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference, appearance]);

  const persistHq = useCallback(
    (theme: ThemePreference, prefs: AppearancePrefs) => {
      if (skipRemote.current) return;
      localEditUntil.current = Date.now() + 1400;
      void saver.current
        .push(settingsPatchFromAppearance({ theme, ...prefs }))
        .then(() => setHqSynced(true))
        .catch(() => undefined);
    },
    [],
  );

  const patchAppearance = useCallback(
    (partial: Partial<AppearancePrefs>) => {
      setAppearance((prev) => {
        const next = { ...prev, ...partial };
        writeAppearance(next);
        persistHq(preference, next);
        return next;
      });
    },
    [persistHq, preference],
  );

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      persistHq(next, appearance);
    },
    [appearance, persistHq],
  );

  const setFont = useCallback(
    (font: UiFont) => patchAppearance({ font }),
    [patchAppearance],
  );
  const setAccent = useCallback(
    (accent: UiAccent) => patchAppearance({ accent }),
    [patchAppearance],
  );
  const setDensity = useCallback(
    (density: UiDensity) => patchAppearance({ density }),
    [patchAppearance],
  );
  const setReduceMotion = useCallback(
    (reduceMotion: boolean) => patchAppearance({ reduceMotion }),
    [patchAppearance],
  );
  const resetAppearance = useCallback(() => {
    writeAppearance(DEFAULT_APPEARANCE);
    setAppearance(DEFAULT_APPEARANCE);
    setPreferenceState("system");
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    persistHq("system", DEFAULT_APPEARANCE);
  }, [persistHq]);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      appearance,
      setFont,
      setAccent,
      setDensity,
      setReduceMotion,
      resetAppearance,
      hqSynced,
    }),
    [
      preference,
      resolved,
      setPreference,
      appearance,
      setFont,
      setAccent,
      setDensity,
      setReduceMotion,
      resetAppearance,
      hqSynced,
    ],
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return {
    preference: value.preference,
    resolved: value.resolved,
    setPreference: value.setPreference,
  };
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within ThemeProvider");
  return value;
}
