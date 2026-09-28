// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { mount } from "./support/dom";

describe("LiveRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shares one clock across instances and stops it when none remain", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-09-26T12:00:00Z") });
    const setInterval = vi.spyOn(window, "setInterval");
    const clearInterval = vi.spyOn(window, "clearInterval");
    const view = await mount(
      <>
        <LiveRelativeTime value="2026-09-26T11:59:50Z" />|
        <LiveRelativeTime value="2026-09-20T12:00:00Z" />|
        <LiveRelativeTime value="2026-09-26T11:00:00Z" />
      </>,
    );
    const container = view.host;
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("10s|6d|1h");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.textContent).toBe("15s|6d|1h");

    await view.unmount();
    expect(clearInterval).toHaveBeenCalledTimes(1);
  });
});
