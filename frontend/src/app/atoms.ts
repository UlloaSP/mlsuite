/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const systemTheme = (): ResolvedTheme =>
  window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";

const resolveTheme = (mode: ThemeMode): ResolvedTheme => mode === "system" ? systemTheme() : mode;

const syncThemeChrome = (mode: ThemeMode) => {
  const theme = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  const meta = document.querySelector('meta[name="theme-color"][media*="color-scheme"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#101418" : "#f7f7f7");
  }
};

/* 2. Átomo persistente                                          */
export const themeAtom = atomWithStorage<ThemeMode>(
  "ui/theme",
  "system",
);

/* 3. Efecto inmediato al primer montaje                         */
themeAtom.onMount = (set) => {
  set((currentTheme) => {
    syncThemeChrome(currentTheme);
    return currentTheme;
  });
};

/* 4. Átomo de orquestación para UI                              */
export const themeWithHtmlAtom = atom(
  (get) => resolveTheme(get(themeAtom)),
  (_, set, newTheme: ThemeMode) => {
    syncThemeChrome(newTheme);
    set(themeAtom, newTheme); // persiste en localStorage
  },
);

/** Estado de pantalla completa: no se persiste */
export const fullscreenAtom = atom(false);

/** Estado de la barra lateral: persiste en localStorage */
export const sidebarCollapsedAtom = atomWithStorage<boolean>("ui/sidebar-collapsed", false);
