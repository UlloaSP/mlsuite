// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { formatDate, formatTimestamp } from "@/shared/lib/date-time";
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
    expect(container.textContent).toBe("10s ago|6d ago|1h ago");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.textContent).toBe("15s ago|6d ago|1h ago");

    await view.unmount();
    expect(clearInterval).toHaveBeenCalledTimes(1);
  });

  it("says when as a date once it is more than a week old, with the moment on hover", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-09-26T12:00:00Z") });
    const { host } = await mount(<LiveRelativeTime value="2026-09-02T12:00:00Z" />);

    const time = host.querySelector("time");
    expect(time?.textContent).toBe(formatDate("2026-09-02T12:00:00Z"));
    expect(time?.getAttribute("dateTime")).toBe("2026-09-02T12:00:00Z");
    expect(time?.title).toBe(formatTimestamp("2026-09-02T12:00:00Z"));
  });
});
