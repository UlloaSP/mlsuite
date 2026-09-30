// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useQuietScrollbars } from "@/app/layouts/use-quiet-scrollbars";
import { mount } from "./support/dom";

function Harness({ enabled }: { enabled: boolean }) {
  useQuietScrollbars(enabled);
  return null;
}

describe("quiet scrollbars", () => {
  let scroller: HTMLElement;

  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const pointerAt = (clientX: number) =>
    scroller.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX }));

  it("reveals a scrollbar only while the pointer is over it", async () => {
    await mount(<Harness enabled />);

    pointerAt(50);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
    pointerAt(105);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(true);
    pointerAt(40);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
  });

  it("reveals a scrolling element briefly", async () => {
    await mount(<Harness enabled />);

    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
  });

  it("does nothing with fixed navigation", async () => {
    await mount(<Harness enabled={false} />);

    pointerAt(105);
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.hasAttribute("data-scrollbar-visible")).toBe(false);
  });
});
