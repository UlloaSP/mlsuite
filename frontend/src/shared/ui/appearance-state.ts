/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom, type WritableAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { validatedStorage } from "@/shared/lib/validated-storage";
import { isCustomTheme, isThemeId, type CustomTheme, type ThemeId } from "./theme-catalog";

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
const DEFAULT_SELECTION: ThemeSelection = { light: "mlsuite", dark: "mlsuite" };

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

const stored = <T>(key: string, initialValue: T, isValid: (value: unknown) => value is T) =>
  atomWithStorage(key, initialValue, validatedStorage(isValid), { getOnInit: true });

const storedModeAtom = stored<ThemeMode>("ui/color-scheme", "system", isThemeMode);
const storedSelectionAtom = stored("ui/theme-selection", DEFAULT_SELECTION, isSelectionShape);
const storedContrastAtom = stored<ContrastLevel>("ui/contrast", 100, isContrastLevel);
const storedCustomThemesAtom = stored<CustomTheme[]>("ui/custom-themes", [], isCustomThemes);

const selectionFor = (selection: ThemeSelection, customThemes: readonly CustomTheme[]) =>
  isThemeId(selection.light, customThemes) && isThemeId(selection.dark, customThemes)
    ? selection
    : DEFAULT_SELECTION;

const appearanceAtom = atom<Appearance>((get) => {
  const customThemes = get(storedCustomThemesAtom);
  return {
    mode: get(storedModeAtom),
    selection: selectionFor(get(storedSelectionAtom), customThemes),
    contrast: get(storedContrastAtom),
    customThemes,
  };
});

/** Persists one preference, then applies the whole resulting appearance once. */
const applied = <T>(read: (appearance: Appearance) => T, base: WritableAtom<T, [T], void>) =>
  atom(
    (get) => read(get(appearanceAtom)),
    (get, set, value: T) => {
      set(base, value);
      window.__MLSUITE_APPLY_APPEARANCE__?.(get(appearanceAtom));
    },
  );

export const themeModeAtom = applied(({ mode }) => mode, storedModeAtom);
export const themeSelectionAtom = applied(({ selection }) => selection, storedSelectionAtom);
export const contrastAtom = applied(({ contrast }) => contrast, storedContrastAtom);
export const customThemesAtom = applied(({ customThemes }) => customThemes, storedCustomThemesAtom);

const systemDarkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");
const systemThemeAtom = atom<ResolvedTheme>(systemDarkQuery()?.matches ? "dark" : "light");
systemThemeAtom.onMount = (setTheme) => {
  const media = systemDarkQuery();
  if (!media) return undefined;
  const sync = () => setTheme(media.matches ? "dark" : "light");
  media.addEventListener?.("change", sync);
  return () => media.removeEventListener?.("change", sync);
};

export const themeWithHtmlAtom = atom(
  (get) => {
    const mode = get(themeModeAtom);
    return mode === "system" ? get(systemThemeAtom) : mode;
  },
  (_, set, mode: ThemeMode) => set(themeModeAtom, mode),
);
