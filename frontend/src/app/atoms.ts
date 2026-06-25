/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
const THEME_STORAGE_KEY = "ui/theme";
const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

declare global {
  interface Window {
    __MLSUITE_APPLY_THEME__?: (mode: ThemeMode) => ResolvedTheme;
  }
}

const systemTheme = (): ResolvedTheme =>
  window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";

const resolveTheme = (mode: ThemeMode): ResolvedTheme => (mode === "system" ? systemTheme() : mode);

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && THEME_MODES.includes(value as ThemeMode);

const readStoredThemeMode = (): ThemeMode => {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return isThemeMode(parsed) ? parsed : "system";
  } catch {
    return isThemeMode(raw) ? raw : "system";
  }
};

const syncThemeChrome = (mode: ThemeMode) => {
  if (window.__MLSUITE_APPLY_THEME__) {
    return window.__MLSUITE_APPLY_THEME__(mode);
  }

  const theme = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"][media*="color-scheme"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#101418" : "#f7f7f7");
  }
  return theme;
};

/* 2. Átomo persistente                                          */
const storedThemeAtom = atomWithStorage<ThemeMode>(THEME_STORAGE_KEY, "system", undefined, {
  getOnInit: true,
});

export const themeAtom = atom(
  (get) => get(storedThemeAtom),
  (_, set, newTheme: ThemeMode) => {
    syncThemeChrome(newTheme);
    set(storedThemeAtom, newTheme);
  },
);

themeAtom.onMount = () => {
  syncThemeChrome(readStoredThemeMode());
};

/* 3. Átomo de orquestación para UI                              */
export const themeWithHtmlAtom = atom(
  (get) => resolveTheme(get(themeAtom)),
  (_, set, newTheme: ThemeMode) => set(themeAtom, newTheme),
);

/** Estado de pantalla completa: no se persiste */
export const fullscreenAtom = atom(false);

export const globalSearchOpenAtom = atom(false);

/** Estado de la barra lateral: persiste en localStorage */
export const sidebarCollapsedAtom = atomWithStorage<boolean>("ui/sidebar-collapsed", false);
