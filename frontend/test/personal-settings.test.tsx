/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { protectedPages } from "@/app/router/protected-routes";
import { SidebarActions } from "@/app/components/SidebarActions";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { SettingsPage } from "@/features/user/pages/SettingsPage";

let root: Root | null = null;

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

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme-preset");
  document.documentElement.removeAttribute("data-contrast");
  vi.stubGlobal("matchMedia", matchMedia(false));
  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia(false) });
  delete window.__MLSUITE_APPLY_APPEARANCE__;
  delete window.__MLSUITE_APPLY_THEME__;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("personal settings", () => {
  test("cycles the system, light, and dark schemes with Ctrl+Shift+L", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <MemoryRouter>
          <SidebarProvider open onOpenChange={() => undefined}>
            <SidebarActions />
          </SidebarProvider>
        </MemoryRouter>,
      );
    });

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

  test("exposes the global route and applies theme, contrast, and sidebar choices", () => {
    expect(protectedPages.some((route) => route.path === "settings")).toBe(true);

    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <MemoryRouter>
          <SettingsPage />
          <LocationProbe />
        </MemoryRouter>,
      );
    });

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

    act(() => airbnbLight.click());
    expect(localStorage.getItem("ui/color-scheme")).toBe('"light"');
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "airbnb", dark: "mlsuite" }),
    );
    const applyAirbnbPair = airbnbCard.querySelector<HTMLElement>(
      '[aria-label="Use Airbnb for light and dark modes"]',
    )!;
    act(() => applyAirbnbPair.click());
    expect(localStorage.getItem("ui/color-scheme")).toBe('"light"');
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "airbnb", dark: "airbnb" }),
    );
    act(() => airbnbDark.click());
    expect(localStorage.getItem("ui/color-scheme")).toBe('"dark"');
    act(() => {
      Object.defineProperty(contrast, "value", { configurable: true, value: "120" });
      contrast.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const layoutTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Layout",
    )!;
    act(() => layoutTab.click());
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/?section=layout",
    );
    expect(layoutTab.getAttribute("aria-controls")).toBe("personal-settings-panel-layout");
    const left = container.querySelector<HTMLInputElement>('input[value="left"]')!;
    act(() => left.click());

    expect(airbnbLight.getAttribute("aria-pressed")).toBe("true");
    expect(airbnbDark.getAttribute("aria-pressed")).toBe("true");
    expect(airbnbCard.textContent).not.toContain("Apply both");
    expect(left.checked).toBe(true);
    expect(document.documentElement.dataset.themePreset).toBe("airbnb");
    expect(document.documentElement.dataset.contrast).toBe("120");
    expect(localStorage.getItem("ui/theme-selection")).toBe(
      JSON.stringify({ light: "airbnb", dark: "airbnb" }),
    );
    expect(localStorage.getItem("ui/sidebar-position")).toBe('"left"');
    expect(localStorage.getItem("ui/contrast")).toBe("120");
  });

  test("creates a paired theme and prevents conflicting keybindings", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <MemoryRouter>
          <SettingsPage />
          <LocationProbe />
        </MemoryRouter>,
      );
    });

    const createButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Create theme",
    )!;
    const darkScheme = container.querySelector<HTMLInputElement>(
      'input[name="color-scheme"][value="dark"]',
    )!;
    act(() => darkScheme.click());
    act(() => createButton.click());
    expect(localStorage.getItem("ui/color-scheme")).toBe('"dark"');
    const name = document.querySelector<HTMLInputElement>('input[placeholder="Aurora"]')!;
    act(() => {
      // oxlint-disable-next-line typescript/unbound-method -- Native setter bypasses React's value tracker for this controlled-input interaction.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Aurora");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const submit = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.type === "submit" && button.textContent?.includes("Create theme"),
    )!;
    act(() => submit.click());

    const savedThemes = JSON.parse(localStorage.getItem("ui/custom-themes") ?? "[]") as unknown[];
    expect(savedThemes).toHaveLength(1);
    expect(document.body.textContent).toContain("Aurora");

    const keybindingsTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Keybindings",
    )!;
    act(() => keybindingsTab.click());
    const globalSearch = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Change Global Search shortcut"]',
    )!;
    act(() => globalSearch.click());
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
    expect(container.textContent).toContain("Already assigned to Toggle Color Scheme");

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
