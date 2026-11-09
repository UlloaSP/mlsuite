// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { AppToaster } from "@/shared/ui/AppToaster";
import { setThemeMode } from "@/shared/ui/appearance-state";
import { toast } from "@/shared/ui/toast";
import { mount } from "./support/dom";

// Tests run from the frontend directory.
const frontend = process.cwd();
const region = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");

const show = async () => {
  await act(async () => {
    toast.success("Saved", { description: "The schema was saved." });
  });
  // Sonner adds a toast to its region on the next task.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

afterEach(() => {
  act(() => {
    toast.dismiss();
    setThemeMode("system");
  });
});

describe("app toaster", () => {
  test.each(["dark", "light"] as const)(
    "draws toasts in the app's %s scheme with its token styles",
    async (mode) => {
      act(() => setThemeMode(mode));
      await mount(<AppToaster />);
      await show();

      expect(region()?.dataset.sonnerTheme).toBe(mode);
      expect(region()?.classList).toContain("app-toaster");
      expect(document.body.textContent).toContain("The schema was saved.");
    },
  );

  test("follows a scheme change while a toast is shown", async () => {
    act(() => setThemeMode("light"));
    await mount(<AppToaster />);
    await show();

    act(() => setThemeMode("dark"));

    expect(region()?.dataset.sonnerTheme).toBe("dark");
  });

  test("points every color of Sonner's palette at an app token", () => {
    const sonnerCss = readFileSync(join(frontend, "node_modules/sonner/dist/styles.css"), "utf8");
    const appCss = readFileSync(join(frontend, "src/shared/ui/app-toaster.css"), "utf8");
    const palette = sonnerCss.match(/\[data-sonner-theme='dark'\] \{([^}]*)\}/)?.[1] ?? "";
    const sonnerVariables = [...palette.matchAll(/(--[a-z-]+):/g)].map(([, name]) => name);
    const ours = new Map(
      [...appCss.matchAll(/(--[a-z-]+): ([^;]+);/g)].map(([, name, value]) => [name, value]),
    );

    expect(sonnerVariables.length).toBeGreaterThan(10);
    for (const name of sonnerVariables) expect(ours.get(name)).toMatch(/^var\(--color-/);
    expect(ours.get("--border-radius")).toBe("var(--radius-card)");
    expect(appCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsl\(/i);
  });
});
