/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  isCustomTheme,
  isThemeId,
  paletteCssVariables,
  type CustomTheme,
  type ThemeId,
} from "./theme-catalog";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ContrastLevel = 100 | 105 | 110 | 115 | 120 | 125;
export type ThemeSelection = { light: ThemeId; dark: ThemeId };
export type Appearance = {
  mode: ThemeMode;
  selection: ThemeSelection;
  contrast: ContrastLevel;
  customThemes: CustomTheme[];
};

export const nextThemeMode = (mode: ThemeMode): ThemeMode =>
  mode === "system" ? "light" : mode === "light" ? "dark" : "system";

export const CONTRAST_LEVELS = [100, 105, 110, 115, 120, 125] as const;

const MODE_KEY = "ui/color-scheme";
const LEGACY_MODE_KEY = "ui/theme";
const LEGACY_PRESET_KEY = "ui/theme-preset";
const SELECTION_KEY = "ui/theme-selection";
const CONTRAST_KEY = "ui/contrast";
const CUSTOM_THEMES_KEY = "ui/custom-themes";
const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];
const DEFAULT_SELECTION: ThemeSelection = { light: "mlsuite", dark: "mlsuite" };
const EMPTY_PALETTE = {
  background: "#000000",
  surface: "#000000",
  muted: "#000000",
  text: "#000000",
  textMuted: "#000000",
  accent: "#000000",
};
const CUSTOM_STYLE_PROPERTIES = Object.keys(paletteCssVariables(EMPTY_PALETTE));

declare global {
  interface Window {
    __MLSUITE_APPLY_APPEARANCE__?: (appearance: Appearance) => ResolvedTheme;
    __MLSUITE_APPLY_THEME__?: (mode: ThemeMode) => ResolvedTheme;
  }
}

const storedValue = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
};

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && THEME_MODES.includes(value as ThemeMode);
const isContrastLevel = (value: unknown): value is ContrastLevel =>
  typeof value === "number" && CONTRAST_LEVELS.includes(value as ContrastLevel);
const readCustomThemes = () => {
  const value = storedValue(CUSTOM_THEMES_KEY);
  return Array.isArray(value) ? value.filter(isCustomTheme) : [];
};
const validSelection = (
  value: unknown,
  customThemes: readonly CustomTheme[],
): ThemeSelection | null => {
  if (!value || typeof value !== "object") return null;
  const selection = value as Record<string, unknown>;
  return isThemeId(selection.light, customThemes) && isThemeId(selection.dark, customThemes)
    ? { light: selection.light, dark: selection.dark }
    : null;
};

const readAppearance = (): Appearance => {
  const customThemes = readCustomThemes();
  const currentMode = storedValue(MODE_KEY);
  const legacyMode = storedValue(LEGACY_MODE_KEY);
  const legacyPreset = storedValue(LEGACY_PRESET_KEY);
  const migratedPreset = isThemeId(legacyPreset, customThemes) ? legacyPreset : "mlsuite";
  const selection: ThemeSelection = validSelection(storedValue(SELECTION_KEY), customThemes) ?? {
    light: migratedPreset,
    dark: migratedPreset,
  };
  const contrast = storedValue(CONTRAST_KEY);
  return {
    mode: isThemeMode(currentMode)
      ? currentMode
      : currentMode === null && isThemeMode(legacyMode)
        ? legacyMode
        : "system",
    selection,
    contrast: isContrastLevel(contrast) ? contrast : 100,
    customThemes,
  };
};

const systemTheme = (): ResolvedTheme =>
  window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";

const applyCustomPalette = (themeId: ThemeId, customThemes: readonly CustomTheme[]) => {
  const root = document.documentElement;
  CUSTOM_STYLE_PROPERTIES.forEach((property) => root.style.removeProperty(property));
  const custom = customThemes.find(({ id }) => id === themeId);
  if (!custom) return;
  const resolved = root.classList.contains("dark") ? "dark" : "light";
  Object.entries(paletteCssVariables(custom[resolved])).forEach(([property, value]) =>
    root.style.setProperty(property, value),
  );
};

const syncAppearanceChrome = (appearance: Appearance) => {
  if (window.__MLSUITE_APPLY_APPEARANCE__) return window.__MLSUITE_APPLY_APPEARANCE__(appearance);
  const resolved = appearance.mode === "system" ? systemTheme() : appearance.mode;
  const themeId = appearance.selection[resolved];
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.themePreset = themeId;
  root.dataset.themeLight = appearance.selection.light;
  root.dataset.themeDark = appearance.selection.dark;
  root.dataset.contrast = String(appearance.contrast);
  applyCustomPalette(themeId, appearance.customThemes);
  return resolved;
};

const initialAppearance = readAppearance();
const storedModeAtom = atomWithStorage<unknown>(MODE_KEY, initialAppearance.mode, undefined, {
  getOnInit: true,
});
const storedSelectionAtom = atomWithStorage<unknown>(
  SELECTION_KEY,
  initialAppearance.selection,
  undefined,
  { getOnInit: true },
);
const storedContrastAtom = atomWithStorage<unknown>(
  CONTRAST_KEY,
  initialAppearance.contrast,
  undefined,
  { getOnInit: true },
);
const storedCustomThemesAtom = atomWithStorage<unknown>(
  CUSTOM_THEMES_KEY,
  initialAppearance.customThemes,
  undefined,
  { getOnInit: true },
);

const systemThemeAtom = atom<ResolvedTheme>(systemTheme());
systemThemeAtom.onMount = (setTheme) => {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return undefined;
  const sync = () => {
    setTheme(media.matches ? "dark" : "light");
    const appearance = readAppearance();
    if (appearance.mode === "system") syncAppearanceChrome(appearance);
  };
  media.addEventListener?.("change", sync);
  return () => media.removeEventListener?.("change", sync);
};

export const customThemesAtom = atom(
  (get) => {
    const value = get(storedCustomThemesAtom);
    return Array.isArray(value) ? value.filter(isCustomTheme) : [];
  },
  (get, set, themes: CustomTheme[]) => {
    const validThemes = themes.filter(isCustomTheme);
    set(storedCustomThemesAtom, validThemes);
    syncAppearanceChrome({
      mode: get(themeModeAtom),
      selection: get(themeSelectionAtom),
      contrast: get(contrastAtom),
      customThemes: validThemes,
    });
  },
);

export const themeSelectionAtom = atom(
  (get) => validSelection(get(storedSelectionAtom), get(customThemesAtom)) ?? DEFAULT_SELECTION,
  (get, set, selection: ThemeSelection) => {
    const safe = validSelection(selection, get(customThemesAtom)) ?? DEFAULT_SELECTION;
    syncAppearanceChrome({
      mode: get(themeModeAtom),
      selection: safe,
      contrast: get(contrastAtom),
      customThemes: get(customThemesAtom),
    });
    set(storedSelectionAtom, safe);
  },
);

export const themeModeAtom = atom(
  (get) => {
    const value = get(storedModeAtom);
    return isThemeMode(value) ? value : "system";
  },
  (get, set, mode: ThemeMode) => {
    syncAppearanceChrome({
      mode,
      selection: get(themeSelectionAtom),
      contrast: get(contrastAtom),
      customThemes: get(customThemesAtom),
    });
    set(storedModeAtom, mode);
  },
);

export const contrastAtom = atom(
  (get) => {
    const value = get(storedContrastAtom);
    return isContrastLevel(value) ? value : 100;
  },
  (get, set, contrast: ContrastLevel) => {
    syncAppearanceChrome({
      mode: get(themeModeAtom),
      selection: get(themeSelectionAtom),
      contrast,
      customThemes: get(customThemesAtom),
    });
    set(storedContrastAtom, contrast);
  },
);

themeModeAtom.onMount = (setMode) => setMode(readAppearance().mode);
themeSelectionAtom.onMount = (setSelection) => setSelection(readAppearance().selection);
contrastAtom.onMount = (setContrast) => setContrast(readAppearance().contrast);
customThemesAtom.onMount = (setThemes) => setThemes(readAppearance().customThemes);

export const themeAtom = themeModeAtom;
export const themeWithHtmlAtom = atom(
  (get) => {
    const mode = get(themeModeAtom);
    return mode === "system" ? get(systemThemeAtom) : mode;
  },
  (_, set, mode: ThemeMode) => set(themeModeAtom, mode),
);
