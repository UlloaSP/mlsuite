import { createStore } from "jotai";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  DEFAULT_CUSTOM_PALETTES,
  isThemePalette,
  themePaletteContrastError,
} from "@/shared/ui/theme-catalog";

type MatchMediaResult = {
  readonly matches: boolean;
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
};
type TestAppearance = {
  mode: "system" | "light" | "dark";
  selection: { light: string; dark: string };
  contrast: 100 | 105 | 110 | 115 | 120 | 125;
  customThemes: unknown[];
};
type TestWindow = {
  localStorage: Storage;
  matchMedia: ReturnType<typeof vi.fn<() => MatchMediaResult>>;
  __MLSUITE_APPLY_APPEARANCE__?: (appearance: TestAppearance) => string;
  __MLSUITE_APPLY_THEME__?: (mode: string) => string;
};

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  } as unknown as Storage;
};

const createDocument = () => {
  const classes = new Set<string>();
  const documentElement = {
    classList: {
      contains: (name: string) => classes.has(name),
      toggle: (name: string, force?: boolean) => {
        if (force) {
          classes.add(name);
          return true;
        }
        classes.delete(name);
        return false;
      },
    },
    dataset: {} as Record<string, string>,
    style: {
      removeProperty: vi.fn(),
      setProperty: vi.fn(),
    },
  };

  return {
    documentElement,
    querySelector: () => null,
  };
};

const setSystemTheme = (matches: boolean) => {
  const storage = createStorage();
  const document = createDocument();
  const listeners = new Set<() => void>();
  let systemDark = matches;
  const media = {
    get matches() {
      return systemDark;
    },
    addEventListener: (_type: "change", listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: "change", listener: () => void) => {
      listeners.delete(listener);
    },
  };
  const window: TestWindow = {
    localStorage: storage,
    matchMedia: vi.fn(() => media),
  };

  vi.stubGlobal("document", document);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", window);

  return {
    document,
    storage,
    window,
    setSystemDark: (next: boolean) => {
      systemDark = next;
      listeners.forEach((listener) => listener());
    },
  };
};

describe("theme persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("cycles through system, light, and dark", async () => {
    setSystemTheme(false);
    const { nextThemeMode } = await import("@/shared/ui/appearance-state");

    expect(nextThemeMode("system")).toBe("light");
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("dark")).toBe("system");
  });

  it("keeps stored dark theme when mounted under a light system theme", async () => {
    const environment = setSystemTheme(false);
    environment.storage.setItem("ui/theme", JSON.stringify("dark"));

    const { themeAtom } = await import("@/shared/ui/appearance-state");
    const store = createStore();
    const unsubscribe = store.sub(themeAtom, () => undefined);

    expect(store.get(themeAtom)).toBe("dark");
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset).toEqual({
      contrast: "100",
      themeDark: "mlsuite",
      themeLight: "mlsuite",
      themePreset: "mlsuite",
    });

    unsubscribe();
  });

  it("defaults to system theme and resolves from media preference", async () => {
    const environment = setSystemTheme(true);

    const { themeAtom, themeWithHtmlAtom } = await import("@/shared/ui/appearance-state");
    const store = createStore();
    const unsubscribe = store.sub(themeAtom, () => undefined);

    expect(store.get(themeAtom)).toBe("system");
    expect(store.get(themeWithHtmlAtom)).toBe("dark");
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset).toEqual({
      contrast: "100",
      themeDark: "mlsuite",
      themeLight: "mlsuite",
      themePreset: "mlsuite",
    });

    unsubscribe();
  });

  it("delegates html writes to the boot theme applier", async () => {
    const environment = setSystemTheme(false);
    const applied: string[] = [];
    environment.window.__MLSUITE_APPLY_APPEARANCE__ = vi.fn((appearance: TestAppearance) => {
      applied.push(appearance.mode);
      const theme = appearance.mode === "system" ? "light" : appearance.mode;
      environment.document.documentElement.classList.toggle("dark", theme === "dark");
      return theme;
    });

    const { themeWithHtmlAtom } = await import("@/shared/ui/appearance-state");
    const store = createStore();

    store.set(themeWithHtmlAtom, "dark");

    expect(applied).toEqual(["dark"]);
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset).toEqual({});
  });

  it("migrates, validates, persists, and follows live system theme changes", async () => {
    const environment = setSystemTheme(false);
    environment.storage.setItem("ui/theme", JSON.stringify("system"));
    environment.storage.setItem("ui/theme-preset", JSON.stringify("invalid"));
    environment.storage.setItem("ui/contrast", JSON.stringify(103));

    const { contrastAtom, themeModeAtom, themeSelectionAtom, themeWithHtmlAtom } =
      await import("@/shared/ui/appearance-state");
    const { THEME_PRESETS } = await import("@/shared/ui/theme-catalog");
    const store = createStore();
    const unsubscribers = [themeModeAtom, themeSelectionAtom, contrastAtom, themeWithHtmlAtom].map(
      (appearanceAtom) => store.sub(appearanceAtom, () => undefined),
    );

    expect(THEME_PRESETS).toHaveLength(6);
    expect(THEME_PRESETS.every(({ preview }) => preview.light.length && preview.dark.length)).toBe(
      true,
    );
    expect(store.get(themeModeAtom)).toBe("system");
    expect(store.get(themeSelectionAtom)).toEqual({ light: "mlsuite", dark: "mlsuite" });
    expect(store.get(contrastAtom)).toBe(100);
    expect(environment.storage.getItem("ui/color-scheme")).toBe(JSON.stringify("system"));
    expect(environment.storage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "mlsuite", dark: "mlsuite" }),
    );
    expect(environment.storage.getItem("ui/contrast")).toBe(JSON.stringify(100));

    store.set(themeSelectionAtom, { light: "ocean", dark: "iris" });
    store.set(contrastAtom, 125);
    expect(environment.document.documentElement.dataset).toEqual({
      contrast: "125",
      themeDark: "iris",
      themeLight: "ocean",
      themePreset: "ocean",
    });
    expect(environment.storage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "ocean", dark: "iris" }),
    );
    expect(environment.storage.getItem("ui/contrast")).toBe(JSON.stringify(125));

    environment.setSystemDark(true);
    expect(store.get(themeWithHtmlAtom)).toBe("dark");
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset.themePreset).toBe("iris");

    unsubscribers.forEach((unsubscribe) => unsubscribe());
  });

  it("applies contrast levels to text, borders, page, and surfaces", () => {
    const css = readFileSync(new URL("../src/shared/ui/appearance.css", import.meta.url), "utf8");

    expect(css).toContain("var(--contrast-text-mix)");
    expect(css).toContain("var(--contrast-border-mix)");
    expect(css).toContain("var(--contrast-page-mix)");
    expect(css).toContain("var(--contrast-surface-mix)");
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
