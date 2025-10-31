import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/* 1. Preferencia inicial – continuidad con el estándar         */
const prefersDark =
	window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

/* 2. Átomo persistente                                          */
export const themeAtom = atomWithStorage<"light" | "dark">(
	"ui/theme",
	prefersDark ? "dark" : "light",
);

/* 3. Efecto inmediato al primer montaje                         */
themeAtom.onMount = (set) => {
	set(() => {
		const root = document.documentElement.classList;
		prefersDark ? root.add("dark") : root.remove("dark");
		return prefersDark ? "dark" : "light";
	});
};

/* 4. Átomo de orquestación para UI                              */
export const themeWithHtmlAtom = atom(
	(get) => get(themeAtom),
	(_, set, newTheme: "light" | "dark") => {
		const root = document.documentElement.classList;
		newTheme === "dark" ? root.add("dark") : root.remove("dark");
		set(themeAtom, newTheme); // persiste en localStorage
	},
);

/** Estado de pantalla completa: no se persiste */
export const fullscreenAtom = atom(false);

export const isDarkMode = atom((get) => get(themeAtom) === "dark");
