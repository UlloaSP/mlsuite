// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { AppTooltip } from "@/shared/ui/AppTooltip";

describe("AppTooltip", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  const focusTrigger = () =>
    act(() => {
      container.querySelector("button")!.focus();
      vi.advanceTimersByTime(500);
    });

  it("names an icon control with its shortcut on keyboard focus", () => {
    act(() =>
      root.render(
        <AppTooltip label="Global search" shortcut="Control+K Meta+K">
          <button type="button" aria-label="Global search" />
        </AppTooltip>,
      ),
    );
    focusTrigger();

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain("Global search");
    expect([...document.body.querySelectorAll("kbd")].map((kbd) => kbd.textContent)).toEqual(
      expect.arrayContaining(["K"]),
    );
  });

  it("stays closed while disabled", () => {
    act(() =>
      root.render(
        <AppTooltip label="Models" disabled>
          <button type="button">Models</button>
        </AppTooltip>,
      ),
    );
    focusTrigger();

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
  });
});
