/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { createStore } from "jotai";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { MobileSidebarTrigger } from "@/app/components/MobileSidebarTrigger";
import { Sidebar } from "@/app/components/app-sidebar/Sidebar";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { sidebarPositionAtom, sidebarStyleAtom } from "@/shared/ui/sidebar-preferences";

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

let root: Root | undefined;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.unstubAllGlobals();
});

describe("sidebar preferences", () => {
  test("defaults to right and persists left", () => {
    const store = createStore();
    const unsubscribe = store.sub(sidebarPositionAtom, () => undefined);

    expect(store.get(sidebarPositionAtom)).toBe("right");
    store.set(sidebarPositionAtom, "left");
    expect(store.get(sidebarPositionAtom)).toBe("left");
    expect(localStorage.getItem("ui/sidebar-position")).toBe(JSON.stringify("left"));

    unsubscribe();
  });

  test("falls back to right for an invalid stored value", () => {
    localStorage.setItem("ui/sidebar-position", JSON.stringify("center"));
    const store = createStore();
    const unsubscribe = store.sub(sidebarPositionAtom, () => undefined);

    expect(store.get(sidebarPositionAtom)).toBe("right");

    unsubscribe();
  });

  test("defaults to a fixed sidebar and persists floating", () => {
    localStorage.setItem("ui/sidebar-style", JSON.stringify("docked"));
    const store = createStore();
    const unsubscribe = store.sub(sidebarStyleAtom, () => undefined);

    expect(store.get(sidebarStyleAtom)).toBe("fixed");
    store.set(sidebarStyleAtom, "floating");
    expect(localStorage.getItem("ui/sidebar-style")).toBe(JSON.stringify("floating"));

    unsubscribe();
  });

  test("insets a floating sidebar from the viewport on the chosen side", () => {
    vi.stubGlobal("matchMedia", matchMedia(false));
    const container = document.createElement("div");
    root = createRoot(container);
    const render = (side: "left" | "right") =>
      act(() => {
        root?.render(
          <SidebarProvider open onOpenChange={() => undefined}>
            <Sidebar side={side} variant="floating">
              Sidebar
            </Sidebar>
          </SidebarProvider>,
        );
      });

    render("left");
    const left = container.querySelector("aside")!;
    expect(left.dataset.variant).toBe("floating");
    expect([...left.classList]).toEqual(
      expect.arrayContaining(["rounded-2xl", "border", "my-2", "ml-2", "shadow-card"]),
    );
    expect(left.classList.contains("h-screen")).toBe(false);

    render("right");
    expect(container.querySelector("aside")!.classList.contains("mr-2")).toBe(true);
  });

  test("shrinks a collapsed floating sidebar to the height of its icons", () => {
    vi.stubGlobal("matchMedia", matchMedia(false));
    const container = document.createElement("div");
    root = createRoot(container);
    const render = (open: boolean) =>
      act(() => {
        root?.render(
          <SidebarProvider open={open} onOpenChange={() => undefined}>
            <Sidebar side="left" variant="floating">
              Sidebar
            </Sidebar>
          </SidebarProvider>,
        );
      });

    render(false);
    const collapsed = container.querySelector("aside")!;
    expect([...collapsed.classList]).toEqual(expect.arrayContaining(["h-auto", "self-center"]));
    expect(collapsed.classList.contains("h-[calc(100dvh-1rem)]")).toBe(false);

    render(true);
    expect(container.querySelector("aside")!.classList.contains("h-[calc(100dvh-1rem)]")).toBe(
      true,
    );
  });

  test("floats the mobile drawer away from the screen edges", () => {
    vi.stubGlobal("matchMedia", matchMedia(true));
    const container = document.createElement("div");
    root = createRoot(container);

    act(() => {
      root?.render(
        <SidebarProvider open onOpenChange={() => undefined}>
          <MobileSidebarTrigger side="right" />
          <Sidebar side="right" variant="floating">
            Sidebar
          </Sidebar>
        </SidebarProvider>,
      );
    });
    act(() => container.querySelector("button")?.click());

    const drawer = document.body.querySelector<HTMLElement>('[aria-label="Application sidebar"]')!;
    expect([...drawer.classList]).toEqual(
      expect.arrayContaining(["right-2", "top-2", "bottom-2", "rounded-2xl"]),
    );
  });

  test("uses the selected desktop edge and border", () => {
    vi.stubGlobal("matchMedia", matchMedia(false));
    const container = document.createElement("div");
    root = createRoot(container);

    act(() => {
      root?.render(
        <SidebarProvider open onOpenChange={() => undefined}>
          <Sidebar side="left">Sidebar</Sidebar>
        </SidebarProvider>,
      );
    });

    const left = container.querySelector("aside");
    expect(left?.dataset.side).toBe("left");
    expect(left?.classList.contains("border-r")).toBe(true);

    act(() => {
      root?.render(
        <SidebarProvider open onOpenChange={() => undefined}>
          <Sidebar side="right">Sidebar</Sidebar>
        </SidebarProvider>,
      );
    });

    const right = container.querySelector("aside");
    expect(right?.dataset.side).toBe("right");
    expect(right?.classList.contains("border-l")).toBe(true);
  });

  test("anchors the mobile trigger and drawer to the selected edge", () => {
    vi.stubGlobal("matchMedia", matchMedia(true));
    const container = document.createElement("div");
    root = createRoot(container);

    act(() => {
      root?.render(
        <SidebarProvider open onOpenChange={() => undefined}>
          <MobileSidebarTrigger side="left" />
          <Sidebar side="left">Sidebar</Sidebar>
        </SidebarProvider>,
      );
    });

    const trigger = container.querySelector("button");
    expect(trigger?.parentElement?.classList.contains("justify-start")).toBe(true);
    expect(trigger?.getAttribute("aria-label")).toBe("Expand sidebar");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.querySelector(".lucide-panel-left-open")).not.toBeNull();

    act(() => trigger?.click());

    const drawer = document.body.querySelector<HTMLElement>('[aria-label="Application sidebar"]');
    expect(drawer?.dataset.side).toBe("left");
    expect(drawer?.classList.contains("left-0")).toBe(true);
    expect(drawer?.classList.contains("border-r")).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.getAttribute("aria-label")).toBe("Collapse sidebar");
  });
});
