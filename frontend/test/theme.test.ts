import { createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

type MatchMediaResult = Pick<MediaQueryList, "matches">;
type TestWindow = {
  localStorage: Storage;
  matchMedia: ReturnType<typeof vi.fn<() => MatchMediaResult>>;
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
  };

  return {
    documentElement,
    querySelector: () => null,
  };
};

const setSystemTheme = (matches: boolean) => {
  const storage = createStorage();
  const document = createDocument();
  const window: TestWindow = {
    localStorage: storage,
    matchMedia: vi.fn((): MatchMediaResult => ({ matches })),
  };

  vi.stubGlobal("document", document);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", window);

  return {
    document,
    storage,
    window,
  };
};

describe("theme persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("keeps stored dark theme when mounted under a light system theme", async () => {
    const environment = setSystemTheme(false);
    environment.storage.setItem("ui/theme", JSON.stringify("dark"));

    const { themeAtom } = await import("../src/app/atoms");
    const store = createStore();
    const unsubscribe = store.sub(themeAtom, () => undefined);

    expect(store.get(themeAtom)).toBe("dark");
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset).toEqual({});

    unsubscribe();
  });

  it("defaults to system theme and resolves from media preference", async () => {
    const environment = setSystemTheme(true);

    const { themeAtom, themeWithHtmlAtom } = await import("../src/app/atoms");
    const store = createStore();
    const unsubscribe = store.sub(themeAtom, () => undefined);

    expect(store.get(themeAtom)).toBe("system");
    expect(store.get(themeWithHtmlAtom)).toBe("dark");
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset).toEqual({});

    unsubscribe();
  });

  it("delegates html writes to the boot theme applier", async () => {
    const environment = setSystemTheme(false);
    const applied: string[] = [];
    environment.window.__MLSUITE_APPLY_THEME__ = vi.fn((mode: string) => {
      applied.push(mode);
      const theme = mode === "system" ? "light" : mode;
      environment.document.documentElement.classList.toggle("dark", theme === "dark");
      return theme;
    });

    const { themeWithHtmlAtom } = await import("../src/app/atoms");
    const store = createStore();

    store.set(themeWithHtmlAtom, "dark");

    expect(applied).toEqual(["dark"]);
    expect(environment.document.documentElement.classList.contains("dark")).toBe(true);
    expect(environment.document.documentElement.dataset).toEqual({});
  });
});
