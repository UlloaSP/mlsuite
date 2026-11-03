/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { MobileSidebarTrigger } from "@/app/components/MobileSidebarTrigger";
import { Sidebar } from "@/app/components/app-sidebar/Sidebar";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { click, mount } from "./support/dom";

const matchMedia = (matches: boolean) =>
  vi.fn(() => ({
    matches,
    media: "(max-width: 1279px)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The preferences as a freshly loaded page reads them from storage. */
const loadPreferences = () => {
  vi.resetModules();
  return import("@/shared/ui/sidebar-preferences");
};

describe("sidebar preferences", () => {
  test("defaults to right and persists left", async () => {
    const { navigationPositionAtom } = await loadPreferences();

    expect(navigationPositionAtom.get()).toBe("right");
    navigationPositionAtom.set("left");
    expect(navigationPositionAtom.get()).toBe("left");
    expect(localStorage.getItem("ui/sidebar-position")).toBe(JSON.stringify("left"));
    navigationPositionAtom.set("top");
    expect(localStorage.getItem("ui/sidebar-position")).toBe(JSON.stringify("top"));
    navigationPositionAtom.set("bottom");
    expect(navigationPositionAtom.get()).toBe("bottom");
  });

  test("falls back to right for an invalid stored value", async () => {
    localStorage.setItem("ui/sidebar-position", JSON.stringify("center"));
    const { navigationPositionAtom } = await loadPreferences();

    expect(navigationPositionAtom.get()).toBe("right");
  });

  test("follows another tab's choice and ignores one that is not valid", async () => {
    const { navigationPositionAtom } = await loadPreferences();
    const changeElsewhere = (value: string | null) =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ui/sidebar-position",
          newValue: value,
          storageArea: localStorage,
        }),
      );

    changeElsewhere(JSON.stringify("top"));
    expect(navigationPositionAtom.get()).toBe("top");
    changeElsewhere(JSON.stringify("center"));
    expect(navigationPositionAtom.get()).toBe("right");
    changeElsewhere(JSON.stringify("left"));
    changeElsewhere(null);
    expect(navigationPositionAtom.get()).toBe("right");
  });

  test("location defaults to the top breadcrumb, persists a choice, and rejects unknown ones", async () => {
    localStorage.setItem("ui/location-display", JSON.stringify("tree-left"));
    const { locationDisplayAtom } = await loadPreferences();

    expect(locationDisplayAtom.get()).toBe("breadcrumb-top");
    locationDisplayAtom.set("off");
    expect(localStorage.getItem("ui/location-display")).toBe(JSON.stringify("off"));
  });

  test("defaults to a fixed sidebar and persists floating", async () => {
    localStorage.setItem("ui/sidebar-style", JSON.stringify("docked"));
    const { sidebarStyleAtom } = await loadPreferences();

    expect(sidebarStyleAtom.get()).toBe("fixed");
    sidebarStyleAtom.set("floating");
    expect(localStorage.getItem("ui/sidebar-style")).toBe(JSON.stringify("floating"));
  });

  test("insets a floating sidebar from the viewport on the chosen side", async () => {
    vi.stubGlobal("matchMedia", matchMedia(false));
    const sidebar = (side: "left" | "right") => (
      <SidebarProvider open onOpenChange={() => undefined}>
        <Sidebar side={side} variant="floating">
          Sidebar
        </Sidebar>
      </SidebarProvider>
    );

    const { host: container, rerender } = await mount(sidebar("left"));
    const left = container.querySelector("aside")!;
    expect(left.dataset.variant).toBe("floating");
    expect([...left.classList]).toEqual(
      expect.arrayContaining(["rounded-2xl", "border", "my-2", "ml-2", "shadow-card"]),
    );
    expect(left.classList.contains("h-screen")).toBe(false);

    await rerender(sidebar("right"));
    expect(container.querySelector("aside")!.classList.contains("mr-2")).toBe(true);
  });

  test("shrinks a collapsed floating sidebar to the height of its icons", async () => {
    vi.stubGlobal("matchMedia", matchMedia(false));
    const sidebar = (open: boolean) => (
      <SidebarProvider open={open} onOpenChange={() => undefined}>
        <Sidebar side="left" variant="floating">
          Sidebar
        </Sidebar>
      </SidebarProvider>
    );

    const { host: container, rerender } = await mount(sidebar(false));
    const collapsed = container.querySelector("aside")!;
    expect([...collapsed.classList]).toEqual(expect.arrayContaining(["h-auto", "self-center"]));
    expect(collapsed.classList.contains("h-[calc(100dvh-1rem)]")).toBe(false);

    await rerender(sidebar(true));
    expect(container.querySelector("aside")!.classList.contains("h-[calc(100dvh-1rem)]")).toBe(
      true,
    );
  });

  test("floats the mobile drawer away from the screen edges", async () => {
    vi.stubGlobal("matchMedia", matchMedia(true));
    const { host: container } = await mount(
      <SidebarProvider open onOpenChange={() => undefined}>
        <MobileSidebarTrigger side="right" />
        <Sidebar side="right" variant="floating">
          Sidebar
        </Sidebar>
      </SidebarProvider>,
    );
    await click(container.querySelector("button")!);

    const drawer = document.body.querySelector<HTMLElement>('[aria-label="Application sidebar"]')!;
    expect([...drawer.classList]).toEqual(
      expect.arrayContaining(["right-2", "top-2", "bottom-2", "rounded-2xl"]),
    );
  });

  test("uses the selected desktop edge and border", async () => {
    vi.stubGlobal("matchMedia", matchMedia(false));
    const { host: container, rerender } = await mount(
      <SidebarProvider open onOpenChange={() => undefined}>
        <Sidebar side="left">Sidebar</Sidebar>
      </SidebarProvider>,
    );

    const left = container.querySelector("aside");
    expect(left?.dataset.side).toBe("left");
    expect(left?.classList.contains("border-r")).toBe(true);

    await rerender(
      <SidebarProvider open onOpenChange={() => undefined}>
        <Sidebar side="right">Sidebar</Sidebar>
      </SidebarProvider>,
    );

    const right = container.querySelector("aside");
    expect(right?.dataset.side).toBe("right");
    expect(right?.classList.contains("border-l")).toBe(true);
  });

  test("anchors the mobile trigger and drawer to the selected edge", async () => {
    vi.stubGlobal("matchMedia", matchMedia(true));
    const { host: container } = await mount(
      <SidebarProvider open onOpenChange={() => undefined}>
        <MobileSidebarTrigger side="left" />
        <Sidebar side="left">Sidebar</Sidebar>
      </SidebarProvider>,
    );

    const trigger = container.querySelector("button");
    expect(trigger?.parentElement?.classList.contains("justify-start")).toBe(true);
    expect(trigger?.getAttribute("aria-label")).toBe("Expand sidebar");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.querySelector(".lucide-panel-left-open")).not.toBeNull();

    await click(trigger!);

    const drawer = document.body.querySelector<HTMLElement>('[aria-label="Application sidebar"]');
    expect(drawer?.dataset.side).toBe("left");
    expect(drawer?.classList.contains("left-0")).toBe(true);
    expect(drawer?.classList.contains("border-r")).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.getAttribute("aria-label")).toBe("Collapse sidebar");
  });
});
