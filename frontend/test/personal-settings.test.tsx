/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { createStore, Provider } from "jotai";
import { resolve } from "node:path";
import { act } from "react";
import { useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { protectedPages } from "@/app/router/protected-routes";
import { SidebarActions } from "@/app/components/SidebarActions";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { useDisplayShortcuts } from "@/app/layouts/use-display-shortcuts";
import { SettingsPage } from "@/features/user/pages/SettingsPage";
import { changeValue, click, mount } from "./support/dom";

// Importing the plain browser script runs it, as index.html does before the app loads.
const BOOT_SCRIPT = resolve(import.meta.dirname, "../public/appearance-boot.js");

function DisplayShortcuts() {
  useDisplayShortcuts();
  return null;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

const matchMedia = (matches: boolean) =>
  vi.fn(() => ({
    addEventListener: vi.fn(),
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    removeEventListener: vi.fn(),
  }));

beforeEach(async () => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme-preset");
  document.documentElement.removeAttribute("data-contrast");
  vi.stubGlobal("matchMedia", matchMedia(false));
  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia(false) });
  // Installs the appearance applier once; it reads storage and media on every call.
  await import(BOOT_SCRIPT);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("personal settings", () => {
  test("keeps sidebar tooling to guide and search", async () => {
    const { host: container } = await mount(
      <SidebarProvider open onOpenChange={() => undefined}>
        <SidebarActions />
      </SidebarProvider>,
      { route: "/" },
    );

    const labels = Array.from(container.querySelectorAll("li")).map((item) =>
      item.textContent?.replace(/Ctrl.*$/, "").trim(),
    );
    expect(labels).toEqual(["User guide", "Global search"]);
  });

  test("cycles the system, light, and dark schemes with Ctrl+Shift+L", async () => {
    await mount(<DisplayShortcuts />);

    const pressThemeShortcut = () =>
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            bubbles: true,
            ctrlKey: true,
            key: "l",
            shiftKey: true,
          }),
        );
      });

    pressThemeShortcut();
    expect(localStorage.getItem("ui/color-scheme")).toBe('"light"');
    pressThemeShortcut();
    expect(localStorage.getItem("ui/color-scheme")).toBe('"dark"');
    pressThemeShortcut();
    expect(localStorage.getItem("ui/color-scheme")).toBe('"system"');
  });

  test("exposes the global route and applies theme, contrast, and sidebar choices", async () => {
    expect(protectedPages.some((route) => route.path === "settings")).toBe(true);

    const { host: container } = await mount(
      <Provider store={createStore()}>
        <SettingsPage />
        <LocationProbe />
      </Provider>,
      { route: "/" },
    );

    const contrast = container.querySelector<HTMLInputElement>("#interface-contrast")!;
    const airbnbCard = Array.from(container.querySelectorAll("article")).find((card) =>
      card.textContent?.includes("Airbnb"),
    )!;
    const airbnbLight = airbnbCard.querySelector<HTMLButtonElement>(
      'button[aria-label="Use Airbnb for light mode"]',
    )!;
    const airbnbDark = airbnbCard.querySelector<HTMLButtonElement>(
      'button[aria-label="Use Airbnb for dark mode"]',
    )!;

    expect(airbnbCard.className).not.toContain("min-h-44");

    await click(airbnbLight);
    expect(localStorage.getItem("ui/color-scheme")).toBe('"light"');
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "airbnb", dark: "mlsuite" }),
    );
    const applyAirbnbPair = airbnbCard.querySelector<HTMLElement>(
      '[aria-label="Use Airbnb for light and dark modes"]',
    )!;
    await click(applyAirbnbPair);
    expect(localStorage.getItem("ui/color-scheme")).toBe('"light"');
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "airbnb", dark: "airbnb" }),
    );
    await click(airbnbDark);
    expect(localStorage.getItem("ui/color-scheme")).toBe('"dark"');
    act(() => {
      Object.defineProperty(contrast, "value", { configurable: true, value: "120" });
      contrast.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const layoutTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Layout",
    )!;
    act(() => {
      layoutTab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/?section=layout",
    );
    const panel = document.getElementById(layoutTab.getAttribute("aria-controls")!)!;
    expect(panel.getAttribute("role")).toBe("tabpanel");
    expect(panel.classList.contains("overflow-y-auto")).toBe(true);
    expect(panel.contains(container.querySelector("h1"))).toBe(false);
    expect(panel.contains(layoutTab)).toBe(false);
    const left = container.querySelector<HTMLInputElement>('input[value="left"]')!;
    await click(left);

    expect(airbnbLight.getAttribute("aria-pressed")).toBe("true");
    expect(airbnbDark.getAttribute("aria-pressed")).toBe("true");
    expect(airbnbCard.textContent).not.toContain("Apply both");
    expect(left.checked).toBe(true);
    const floating = container.querySelector<HTMLInputElement>(
      'input[name="sidebar-style"][value="floating"]',
    )!;
    await click(floating);
    expect(floating.checked).toBe(true);
    expect(localStorage.getItem("ui/sidebar-style")).toBe('"floating"');
    const collapse = [...container.querySelectorAll<HTMLInputElement>('input[role="switch"]')].find(
      (input) => input.closest("label")?.textContent?.includes("Collapsed navigation"),
    )!;
    await click(collapse);
    expect(localStorage.getItem("ui/sidebar-collapsed")).toBe("true");
    const fullscreen = [
      ...container.querySelectorAll<HTMLInputElement>('input[role="switch"]'),
    ].find((input) => input.closest("label")?.textContent?.includes("Fullscreen"))!;
    expect(fullscreen.disabled).toBe(true);
    expect(container.textContent).toContain(
      "This browser does not allow pages to enter fullscreen.",
    );
    expect(document.documentElement.dataset.themePreset).toBe("airbnb");
    expect(document.documentElement.dataset.contrast).toBe("120");
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "airbnb", dark: "airbnb" }),
    );
    expect(localStorage.getItem("ui/sidebar-position")).toBe('"left"');
    expect(localStorage.getItem("ui/contrast")).toBe("120");
  });

  test("creates a paired theme and prevents conflicting keybindings", async () => {
    const { host: container } = await mount(
      <Provider store={createStore()}>
        <SettingsPage />
        <LocationProbe />
      </Provider>,
      { route: "/" },
    );

    const darkScheme = container.querySelector<HTMLInputElement>(
      'input[name="color-scheme"][value="dark"]',
    )!;
    await click(darkScheme);
    await click("Create theme", container);
    expect(localStorage.getItem("ui/color-scheme")).toBe('"dark"');
    const name = document.querySelector<HTMLInputElement>('input[placeholder="Aurora"]')!;
    await changeValue(name, "Aurora");
    const submit = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.type === "submit" && button.textContent?.includes("Create theme"),
    )!;
    await click(submit);

    const savedThemes = JSON.parse(localStorage.getItem("ui/custom-themes") ?? "[]") as unknown[];
    expect(savedThemes).toHaveLength(1);
    expect(document.body.textContent).toContain("Aurora");

    const keybindingsTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Keybindings",
    )!;
    act(() => {
      keybindingsTab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    const globalSearch = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Change Global search shortcut"]',
    )!;
    await click(globalSearch);
    act(() => {
      globalSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          ctrlKey: true,
          shiftKey: true,
          key: "l",
        }),
      );
    });
    expect(container.textContent).toContain("Already assigned to Toggle color scheme");

    act(() => {
      globalSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          ctrlKey: true,
          key: "g",
        }),
      );
    });
    const savedBindings = JSON.parse(localStorage.getItem("ui/keybindings") ?? "{}") as {
      "global-search": { key: string };
    };
    expect(savedBindings["global-search"].key).toBe("g");
  });
});
