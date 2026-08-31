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
import { sidebarPositionAtom } from "@/shared/ui/sidebar-position";

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

describe("sidebar position", () => {
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
    expect(trigger?.classList.contains("left-4")).toBe(true);
    expect(trigger?.querySelector(".lucide-panel-left-close")).not.toBeNull();

    act(() => trigger?.click());

    const drawer = document.body.querySelector<HTMLElement>('[aria-label="Application sidebar"]');
    expect(drawer?.dataset.side).toBe("left");
    expect(drawer?.classList.contains("left-0")).toBe(true);
    expect(drawer?.classList.contains("border-r")).toBe(true);
  });
});
