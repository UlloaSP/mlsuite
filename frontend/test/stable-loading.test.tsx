// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  LOADING_MIN_VISIBLE_MS,
  LOADING_REVEAL_DELAY_MS,
  useStableLoading,
} from "@/shared/ui/useStableLoading";

function LoadingProbe({ loading }: { loading: boolean }) {
  const stable = useStableLoading(loading);
  return <div data-loading={stable} />;
}

describe("stable loading", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.useRealTimers();
  });

  const render = async (loading: boolean) => {
    await act(async () => root.render(<LoadingProbe loading={loading} />));
  };

  const loading = () => container.firstElementChild?.getAttribute("data-loading");

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
