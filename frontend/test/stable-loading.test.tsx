// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  LOADING_MIN_VISIBLE_MS,
  LOADING_REVEAL_DELAY_MS,
  useStableLoading,
} from "@/shared/ui/useStableLoading";
import { mount, type Mounted } from "./support/dom";

function LoadingProbe({ loading }: { loading: boolean }) {
  const stable = useStableLoading(loading);
  return <div data-loading={stable} />;
}

describe("stable loading", () => {
  let view: Mounted;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    view = await mount(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const render = (loading: boolean) => view.rerender(<LoadingProbe loading={loading} />);

  const loading = () => view.host.firstElementChild?.getAttribute("data-loading");

  it("drops fast loading states before the visual reveal", async () => {
    await render(true);
    expect(loading()).toBe("true");

    await act(async () => vi.advanceTimersByTime(LOADING_REVEAL_DELAY_MS - 1));
    await render(false);

    expect(loading()).toBe("false");
  });

  it("holds a revealed loading state for the minimum visible duration", async () => {
    await render(true);
    await act(async () => vi.advanceTimersByTime(LOADING_REVEAL_DELAY_MS + 20));
    await render(false);

    expect(loading()).toBe("true");

    await act(async () => vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS - 21));
    expect(loading()).toBe("true");

    await act(async () => vi.advanceTimersByTime(1));
    expect(loading()).toBe("false");
  });
});
