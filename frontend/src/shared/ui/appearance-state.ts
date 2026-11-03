/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createAtom, type Atom } from "@tanstack/react-store";
import { createPersistedAtom } from "@/shared/lib/persisted-atom";
import {
  DEFAULT_THEME_ID,
  isCustomTheme,
  isThemeId,
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

const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];
const DEFAULT_SELECTION: ThemeSelection = { light: DEFAULT_THEME_ID, dark: DEFAULT_THEME_ID };

declare global {
  interface Window {
    // Installed by public/appearance-boot.js, which also migrates, persists, and
    // follows live system theme changes before React mounts.
    __MLSUITE_APPLY_APPEARANCE__?: (appearance: Appearance) => ResolvedTheme;
  }
}

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && THEME_MODES.includes(value as ThemeMode);
const isContrastLevel = (value: unknown): value is ContrastLevel =>
  typeof value === "number" && CONTRAST_LEVELS.includes(value as ContrastLevel);
const isCustomThemes = (value: unknown): value is CustomTheme[] =>
  Array.isArray(value) && value.every(isCustomTheme);
const isSelectionShape = (value: unknown): value is ThemeSelection =>
  !!value &&
  typeof (value as ThemeSelection).light === "string" &&
  typeof (value as ThemeSelection).dark === "string";

const storedModeAtom = createPersistedAtom<ThemeMode>("ui/color-scheme", "system", isThemeMode);
const storedSelectionAtom = createPersistedAtom(
  "ui/theme-selection",
  DEFAULT_SELECTION,
  isSelectionShape,
);
const storedContrastAtom = createPersistedAtom<ContrastLevel>("ui/contrast", 100, isContrastLevel);
const storedCustomThemesAtom = createPersistedAtom<CustomTheme[]>(
  "ui/custom-themes",
  [],
  isCustomThemes,
);

const selectionFor = (selection: ThemeSelection, customThemes: readonly CustomTheme[]) =>
  isThemeId(selection.light, customThemes) && isThemeId(selection.dark, customThemes)
    ? selection
    : DEFAULT_SELECTION;

const appearanceAtom = createAtom<Appearance>(() => {
  const customThemes = storedCustomThemesAtom.get();
  return {
    mode: storedModeAtom.get(),
    selection: selectionFor(storedSelectionAtom.get(), customThemes),
    contrast: storedContrastAtom.get(),
    customThemes,
  };
});

export const themeModeAtom = createAtom(() => appearanceAtom.get().mode);
export const themeSelectionAtom = createAtom(() => appearanceAtom.get().selection);
export const contrastAtom = createAtom(() => appearanceAtom.get().contrast);
export const customThemesAtom = createAtom(() => appearanceAtom.get().customThemes);

/** Persists one preference, then applies the whole resulting appearance once. */
const applied =
  <T>(base: Atom<T>) =>
  (value: T) => {
    base.set(value);
    window.__MLSUITE_APPLY_APPEARANCE__?.(appearanceAtom.get());
  };

export const setThemeMode = applied(storedModeAtom);
export const setThemeSelection = applied(storedSelectionAtom);
export const setContrast = applied(storedContrastAtom);
export const setCustomThemes = applied(storedCustomThemesAtom);

const systemDarkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");
let systemThemeAtom: Atom<ResolvedTheme> | undefined;

/** The system scheme, followed from the first time a theme resolves against it. */
const systemTheme = () => {
  if (!systemThemeAtom) {
    const media = systemDarkQuery();
    const theme = createAtom<ResolvedTheme>(media?.matches ? "dark" : "light");
    media?.addEventListener?.("change", () => theme.set(media.matches ? "dark" : "light"));
    systemThemeAtom = theme;
  }
  return systemThemeAtom;
};

/** The scheme in effect: the chosen one, or the system's while following it. */
export const themeWithHtmlAtom = createAtom<ResolvedTheme>(() => {
  const mode = themeModeAtom.get();
  return mode === "system" ? systemTheme().get() : mode;
});
