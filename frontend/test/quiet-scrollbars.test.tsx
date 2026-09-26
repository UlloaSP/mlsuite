// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useQuietScrollbars } from "@/app/layouts/use-quiet-scrollbars";

function Harness({ enabled }: { enabled: boolean }) {
  useQuietScrollbars(enabled);
  return null;
}

describe("quiet scrollbars", () => {
  let root: Root;
  let scroller: HTMLElement;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    const content = document.createElement("div");
    content.className = "app-content-transition";
    scroller = document.createElement("div");
    // A 100px-wide viewport with a 10px scrollbar gutter on its right edge.
    Object.defineProperties(scroller, {
      offsetWidth: { value: 110 },
      clientWidth: { value: 100 },
      clientLeft: { value: 0 },
    });
    scroller.getBoundingClientRect = () => ({ left: 0 }) as DOMRect;
    content.append(scroller);
    document.body.append(content);
    root = createRoot(document.createElement("div"));
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  const pointerAt = (clientX: number) =>
    scroller.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX }));

  it("reveals a scrollbar only while the pointer is over it", () => {
    act(() => root.render(<Harness enabled />));

    pointerAt(50);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
    pointerAt(105);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(true);
    pointerAt(40);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
  });

  it("reveals a scrolling element briefly", () => {
    act(() => root.render(<Harness enabled />));

    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
  });

  it("does nothing with fixed navigation", () => {
    act(() => root.render(<Harness enabled={false} />));

    pointerAt(105);
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
  });
});
