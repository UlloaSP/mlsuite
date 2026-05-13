/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/* 1. Preferencia inicial – continuidad con el estándar         */
const prefersDark =
	window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

const syncThemeChrome = (theme: "light" | "dark") => {
	const root = document.documentElement;
	root.classList.toggle("dark", theme === "dark");
	root.dataset.theme = theme;
	const meta = document.querySelector('meta[name="theme-color"][media*="color-scheme"]');
	if (meta) {
		meta.setAttribute("content", theme === "dark" ? "#101418" : "#f7f7f7");
	}
};

/* 2. Átomo persistente                                          */
export const themeAtom = atomWithStorage<"light" | "dark">(
	"ui/theme",
	prefersDark ? "dark" : "light",
);

/* 3. Efecto inmediato al primer montaje                         */
themeAtom.onMount = (set) => {
	set(() => {
		syncThemeChrome(prefersDark ? "dark" : "light");
		return prefersDark ? "dark" : "light";
	});
};

/* 4. Átomo de orquestación para UI                              */
export const themeWithHtmlAtom = atom(
	(get) => get(themeAtom),
	(_, set, newTheme: "light" | "dark") => {
		syncThemeChrome(newTheme);
		set(themeAtom, newTheme); // persiste en localStorage
	},
);

/** Estado de pantalla completa: no se persiste */
export const fullscreenAtom = atom(false);

/** Estado de la barra lateral: persiste en localStorage */
export const sidebarCollapsedAtom = atomWithStorage<boolean>("ui/sidebar-collapsed", false);
