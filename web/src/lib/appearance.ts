export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type UiFont =
  | "inter"
  | "dm-sans"
  | "source-sans"
  | "ibm-plex"
  | "nunito"
  | "outfit"
  | "manrope"
  | "space-grotesk";
export type UiAccent =
  | "violet"
  | "teal"
  | "blue"
  | "rose"
  | "amber";
export type UiDensity = "comfortable" | "compact";

export const THEME_STORAGE_KEY = "pos.theme.v1";
export const APPEARANCE_STORAGE_KEY = "pos.appearance.v1";

export type AppearancePrefs = {
  font: UiFont;
  accent: UiAccent;
  density: UiDensity;
  reduceMotion: boolean;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  font: "inter",
  accent: "violet",
  density: "comfortable",
  reduceMotion: false,
};

export const FONT_OPTIONS: {
  id: UiFont;
  label: string;
  sample: string;
  cssVar: string;
}[] = [
  { id: "inter", label: "Inter", sample: "Clean default UI", cssVar: "--font-inter" },
  { id: "dm-sans", label: "DM Sans", sample: "Geometric and modern", cssVar: "--font-dm-sans" },
  {
    id: "source-sans",
    label: "Source Sans 3",
    sample: "Readable at small sizes",
    cssVar: "--font-source-sans",
  },
  {
    id: "ibm-plex",
    label: "IBM Plex Sans",
    sample: "Technical and clear",
    cssVar: "--font-ibm-plex",
  },
  { id: "nunito", label: "Nunito", sample: "Soft and friendly", cssVar: "--font-nunito" },
  { id: "outfit", label: "Outfit", sample: "Sharp display UI", cssVar: "--font-outfit" },
  { id: "manrope", label: "Manrope", sample: "Modern geometric", cssVar: "--font-manrope" },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    sample: "Distinct headlines",
    cssVar: "--font-space-grotesk",
  },
];

export const ACCENT_OPTIONS: { id: UiAccent; label: string; color: string }[] = [
  { id: "violet", label: "Violet", color: "#6d4aff" },
  { id: "teal", label: "Teal", color: "#0f766e" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "amber", label: "Amber", color: "#d97706" },
  { id: "rose", label: "Rose", color: "#e11d48" },
];

const ACCENT_VARS: Record<
  UiAccent,
  { light: Record<string, string>; dark: Record<string, string> }
> = {
  violet: {
    light: {
      "--pos-primary": "#6d4aff",
      "--pos-primary-soft": "#f4f0ff",
      "--pos-primary-muted": "#ddd6fe",
      "--pos-shadow-primary": "0 4px 14px rgb(109 74 255 / 0.24)",
      "--pos-scrollbar-hover": "rgb(109 74 255 / 0.32)",
    },
    dark: {
      "--pos-primary": "#8b7cff",
      "--pos-primary-soft": "#2a2540",
      "--pos-primary-muted": "#3d3560",
      "--pos-shadow-primary": "0 4px 14px rgb(139 124 255 / 0.22)",
      "--pos-scrollbar-hover": "rgb(139 124 255 / 0.42)",
    },
  },
  teal: {
    light: {
      "--pos-primary": "#0f766e",
      "--pos-primary-soft": "#f0fdfa",
      "--pos-primary-muted": "#99f6e4",
      "--pos-shadow-primary": "0 4px 14px rgb(15 118 110 / 0.24)",
      "--pos-scrollbar-hover": "rgb(15 118 110 / 0.32)",
    },
    dark: {
      "--pos-primary": "#2dd4bf",
      "--pos-primary-soft": "#134e4a",
      "--pos-primary-muted": "#115e59",
      "--pos-shadow-primary": "0 4px 14px rgb(45 212 191 / 0.22)",
      "--pos-scrollbar-hover": "rgb(45 212 191 / 0.42)",
    },
  },
  blue: {
    light: {
      "--pos-primary": "#2563eb",
      "--pos-primary-soft": "#eff6ff",
      "--pos-primary-muted": "#bfdbfe",
      "--pos-shadow-primary": "0 4px 14px rgb(37 99 235 / 0.24)",
      "--pos-scrollbar-hover": "rgb(37 99 235 / 0.32)",
    },
    dark: {
      "--pos-primary": "#60a5fa",
      "--pos-primary-soft": "#1e3a5f",
      "--pos-primary-muted": "#1e40af",
      "--pos-shadow-primary": "0 4px 14px rgb(96 165 250 / 0.22)",
      "--pos-scrollbar-hover": "rgb(96 165 250 / 0.42)",
    },
  },
  amber: {
    light: {
      "--pos-primary": "#d97706",
      "--pos-primary-soft": "#fffbeb",
      "--pos-primary-muted": "#fde68a",
      "--pos-shadow-primary": "0 4px 14px rgb(217 119 6 / 0.24)",
      "--pos-scrollbar-hover": "rgb(217 119 6 / 0.32)",
    },
    dark: {
      "--pos-primary": "#fbbf24",
      "--pos-primary-soft": "#451a03",
      "--pos-primary-muted": "#b45309",
      "--pos-shadow-primary": "0 4px 14px rgb(251 191 36 / 0.22)",
      "--pos-scrollbar-hover": "rgb(251 191 36 / 0.42)",
    },
  },
  rose: {
    light: {
      "--pos-primary": "#e11d48",
      "--pos-primary-soft": "#fff1f2",
      "--pos-primary-muted": "#fecdd3",
      "--pos-shadow-primary": "0 4px 14px rgb(225 29 72 / 0.24)",
      "--pos-scrollbar-hover": "rgb(225 29 72 / 0.32)",
    },
    dark: {
      "--pos-primary": "#fb7185",
      "--pos-primary-soft": "#4c0519",
      "--pos-primary-muted": "#9f1239",
      "--pos-shadow-primary": "0 4px 14px rgb(251 113 133 / 0.22)",
      "--pos-scrollbar-hover": "rgb(251 113 133 / 0.42)",
    },
  },
};

const FONT_IDS = new Set(FONT_OPTIONS.map((f) => f.id));
const ACCENT_IDS = new Set(ACCENT_OPTIONS.map((a) => a.id));

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function isUiFont(value: string | null | undefined): value is UiFont {
  return typeof value === "string" && FONT_IDS.has(value as UiFont);
}

export function isUiAccent(value: string | null | undefined): value is UiAccent {
  return typeof value === "string" && ACCENT_IDS.has(value as UiAccent);
}

export function isUiDensity(value: string | null | undefined): value is UiDensity {
  return value === "comfortable" || value === "compact";
}

export function readAppearance(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return {
      font: isUiFont(parsed.font) ? parsed.font : DEFAULT_APPEARANCE.font,
      accent: isUiAccent(parsed.accent) ? parsed.accent : DEFAULT_APPEARANCE.accent,
      density: isUiDensity(parsed.density) ? parsed.density : DEFAULT_APPEARANCE.density,
      reduceMotion:
        typeof parsed.reduceMotion === "boolean"
          ? parsed.reduceMotion
          : DEFAULT_APPEARANCE.reduceMotion,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(prefs: AppearancePrefs) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs));
}

export function applyAppearance(prefs: AppearancePrefs, resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.font = prefs.font;
  root.dataset.density = prefs.density;
  root.dataset.accent = prefs.accent;
  root.classList.toggle("reduce-motion", prefs.reduceMotion);

  const font = FONT_OPTIONS.find((row) => row.id === prefs.font) ?? FONT_OPTIONS[0];
  root.style.setProperty(
    "--pos-font-family",
    `var(${font.cssVar}), ui-sans-serif, system-ui, sans-serif`,
  );

  const vars = ACCENT_VARS[prefs.accent][resolved];
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
