// @vitest-environment jsdom

import { createStore } from "jotai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  DEFAULT_CUSTOM_PALETTES,
  isThemePalette,
  themePaletteContrastError,
} from "@/shared/ui/theme-catalog";

// Importing the plain browser script runs it, as index.html does before the app loads.
const BOOT_SCRIPT = resolve(import.meta.dirname, "../public/appearance-boot.js");

const bootWithSystemTheme = async (dark: boolean) => {
  const listeners = new Set<() => void>();
  let systemDark = dark;
  const media = {
    get matches() {
      return systemDark;
    },
    addEventListener: (_type: "change", listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: "change", listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => media);
  await import(BOOT_SCRIPT);
  return (next: boolean) => {
    systemDark = next;
    listeners.forEach((listener) => listener());
  };
};

const root = document.documentElement;
const themeData = () => ({
  contrast: root.dataset.contrast,
  themeDark: root.dataset.themeDark,
  themeLight: root.dataset.themeLight,
  themePreset: root.dataset.themePreset,
});

describe("theme persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    localStorage.clear();
    root.className = "";
    Object.keys(root.dataset).forEach((key) => delete root.dataset[key]);
    delete window.__MLSUITE_APPLY_APPEARANCE__;
  });

  it("cycles through system, light, and dark", async () => {
    const { nextThemeMode } = await import("@/shared/ui/appearance-state");

    expect(nextThemeMode("system")).toBe("light");
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("dark")).toBe("system");
  });

  it("reads preferences the boot script migrated and validated", async () => {
    localStorage.setItem("ui/theme", JSON.stringify("dark"));
    localStorage.setItem("ui/theme-preset", JSON.stringify("invalid"));
    localStorage.setItem("ui/contrast", JSON.stringify(103));
    await bootWithSystemTheme(false);

    const { contrastAtom, themeModeAtom, themeSelectionAtom } =
      await import("@/shared/ui/appearance-state");
    const store = createStore();

    expect(store.get(themeModeAtom)).toBe("dark");
    expect(store.get(themeSelectionAtom)).toEqual({ light: "mlsuite", dark: "mlsuite" });
    expect(store.get(contrastAtom)).toBe(100);
    expect(localStorage.getItem("ui/color-scheme")).toBe(JSON.stringify("dark"));
    expect(localStorage.getItem("ui/contrast")).toBe(JSON.stringify(100));
    expect(root.classList.contains("dark")).toBe(true);
    expect(themeData()).toEqual({
      contrast: "100",
      themeDark: "mlsuite",
      themeLight: "mlsuite",
      themePreset: "mlsuite",
    });
  });

  it("persists and applies choices, then follows live system theme changes", async () => {
    const setSystemDark = await bootWithSystemTheme(false);
    const { contrastAtom, themeModeAtom, themeSelectionAtom, themeWithHtmlAtom } =
      await import("@/shared/ui/appearance-state");
    const store = createStore();
    const unsubscribe = store.sub(themeWithHtmlAtom, () => undefined);

    expect(store.get(themeModeAtom)).toBe("system");
    expect(store.get(themeWithHtmlAtom)).toBe("light");

    store.set(themeSelectionAtom, { light: "ocean", dark: "iris" });
    store.set(contrastAtom, 125);
    expect(themeData()).toEqual({
      contrast: "125",
      themeDark: "iris",
      themeLight: "ocean",
      themePreset: "ocean",
    });
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "ocean", dark: "iris" }),
    );
    expect(localStorage.getItem("ui/contrast")).toBe(JSON.stringify(125));

    setSystemDark(true);
    expect(store.get(themeWithHtmlAtom)).toBe("dark");
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.themePreset).toBe("iris");

    store.set(themeWithHtmlAtom, "light");
    expect(localStorage.getItem("ui/color-scheme")).toBe(JSON.stringify("light"));
    expect(root.classList.contains("dark")).toBe(false);
    unsubscribe();
  });

  it("ignores stored values that are no longer valid", async () => {
    localStorage.setItem("ui/color-scheme", JSON.stringify("sepia"));
    localStorage.setItem("ui/theme-selection", JSON.stringify({ light: "custom-gone", dark: 1 }));
    const { themeModeAtom, themeSelectionAtom } = await import("@/shared/ui/appearance-state");
    const store = createStore();

    expect(store.get(themeModeAtom)).toBe("system");
    expect(store.get(themeSelectionAtom)).toEqual({ light: "mlsuite", dark: "mlsuite" });
  });

  it("applies contrast levels to text, borders, page, and surfaces", () => {
    const tokens = readFileSync(
      resolve(import.meta.dirname, "../src/shared/ui/tokens.css"),
      "utf8",
    );
    const css = readFileSync(
      resolve(import.meta.dirname, "../src/shared/ui/appearance.css"),
      "utf8",
    );

    expect(tokens).toContain("var(--contrast-text-mix)");
    expect(tokens).toContain("var(--contrast-border-mix)");
    expect(tokens).toContain("var(--contrast-page-mix)");
    expect(tokens).toContain("var(--contrast-surface-mix)");
    expect(css).toContain('html[data-contrast="125"]');
    expect(css).toContain("--contrast-page-mix: 5%");
    expect(css).toContain("--contrast-surface-mix: 10%");
  });

  it("accepts accessible custom palettes and rejects low contrast", () => {
    expect(isThemePalette(DEFAULT_CUSTOM_PALETTES.light)).toBe(true);
    expect(isThemePalette(DEFAULT_CUSTOM_PALETTES.dark)).toBe(true);

    const inaccessible = { ...DEFAULT_CUSTOM_PALETTES.light, text: "#ffffff" };
    expect(isThemePalette(inaccessible)).toBe(false);
    expect(themePaletteContrastError(inaccessible)).toContain("Text needs at least 4.5:1");

    const invisibleAccent = { ...DEFAULT_CUSTOM_PALETTES.light, accent: "#ffffff" };
    expect(isThemePalette(invisibleAccent)).toBe(false);
    expect(themePaletteContrastError(invisibleAccent)).toContain(
      "Accent needs at least 3:1 contrast",
    );
  });
});
