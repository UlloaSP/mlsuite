// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { animateLayoutChange } from "@/shared/ui/layout-transition";

const stubStartViewTransition = (value: unknown) =>
  Object.defineProperty(document, "startViewTransition", { configurable: true, value });

const setReducedMotion = (matches: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches })),
  );

describe("layout transition", () => {
  let sidebar: HTMLElement;
  let content: HTMLElement;

  beforeEach(() => {
    sidebar = document.createElement("aside");
    sidebar.setAttribute("data-app-sidebar", "");
    content = document.createElement("div");
    content.className = "app-content-transition";
    document.body.append(sidebar, content);
    setReducedMotion(false);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    Reflect.deleteProperty(document, "startViewTransition");
    vi.unstubAllGlobals();
  });

  it("names the shell parts only while the change morphs", async () => {
    let finish: () => void = () => undefined;
    const namesDuringUpdate: string[] = [];
    stubStartViewTransition(
      vi.fn((callback: () => void) => {
        callback();
        return { finished: new Promise<void>((resolve) => (finish = resolve)) };
      }),
    );

    animateLayoutChange(() => {
      namesDuringUpdate.push(sidebar.style.viewTransitionName, content.style.viewTransitionName);
    });

    expect(namesDuringUpdate).toEqual(["app-layout-sidebar", "app-layout-main"]);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(sidebar.style.viewTransitionName).toBe("");
    expect(content.style.viewTransitionName).toBe("");
  });

  it("applies the change directly when motion is reduced or unsupported", () => {
    const update = vi.fn();
    const start = vi.fn();

    animateLayoutChange(update);
    expect(update).toHaveBeenCalledOnce();

    stubStartViewTransition(start);
    setReducedMotion(true);
    animateLayoutChange(update);
    expect(update).toHaveBeenCalledTimes(2);
    expect(start).not.toHaveBeenCalled();
  });
});
