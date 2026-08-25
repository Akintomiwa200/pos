export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export {
  THEME_STORAGE_KEY,
  getSystemTheme,
  resolveTheme,
  isThemePreference,
  applyTheme,
} from "./appearance";
