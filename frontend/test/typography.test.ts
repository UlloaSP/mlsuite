import { createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as unknown as Storage;
};

describe("typography preferences", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("rejects invalid storage and applies valid interface and code settings", async () => {
    const localStorage = storage();
    localStorage.setItem("ui/typography", JSON.stringify({ interfaceFont: "Comic Sans" }));
    const style = { setProperty: vi.fn() };
    const documentElement = { dataset: {} as Record<string, string>, style };
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("document", { documentElement });
    const { typographyAtom } = await import("@/shared/ui/typography-state");
    const store = createStore();
    const unsubscribe = store.sub(typographyAtom, () => undefined);

    expect(store.get(typographyAtom).interfaceFont).toBe("cereal");
    store.set(typographyAtom, {
      interfaceFont: "segoe",
      interfaceSize: 17,
      monospaceFont: "consolas",
      monospaceSize: 15,
      wordWrap: false,
    });

    expect(documentElement.dataset).toEqual({
      interfaceFont: "segoe",
      monospaceFont: "consolas",
      wordWrap: "false",
    });
    expect(style.setProperty).toHaveBeenCalledWith("--ui-font-size", "17px");
    expect(style.setProperty).toHaveBeenCalledWith("--code-font-size", "15px");
    expect(style.setProperty).toHaveBeenCalledWith(
      "--font-sans",
      "'IBM Plex Sans', Arial, sans-serif",
    );
    expect(style.setProperty).toHaveBeenCalledWith(
      "--font-display",
      "'IBM Plex Sans', Arial, sans-serif",
    );
    expect(localStorage.getItem("ui/typography")).toContain('"interfaceFont":"segoe"');
    unsubscribe();
  });
});
