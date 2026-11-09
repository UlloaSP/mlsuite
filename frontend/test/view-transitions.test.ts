// @vitest-environment jsdom

import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryClient } from "@tanstack/react-query";
import { createAppRouter } from "@/app/router/routes";
import {
  ignoreSkippedViewTransitions,
  isSkippedViewTransition,
} from "@/shared/ui/skipped-view-transition";

// jsdom has no View Transitions API; the router only starts one when the document offers it.
const startViewTransition = vi.fn((update: () => unknown) => {
  const updateCallbackDone = Promise.resolve(update()).then(() => undefined);
  return {
    finished: updateCallbackDone,
    ready: Promise.resolve(),
    updateCallbackDone,
    skipTransition() {},
  };
});

beforeEach(() => {
  Object.assign(document, { startViewTransition });
});

afterEach(() => {
  startViewTransition.mockClear();
  Reflect.deleteProperty(document, "startViewTransition");
});

const appRouter = () =>
  createAppRouter(new QueryClient(), createMemoryHistory({ initialEntries: ["/login"] }));

describe("route view transitions", () => {
  it("makes every navigation a view transition unless it opts out", () => {
    expect(appRouter().options.defaultViewTransition).toBe(true);
  });

  it("starts a view transition for a plain navigation", async () => {
    const router = appRouter();

    await router.navigate({ to: "/explore" });

    expect(startViewTransition).toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/explore");
  });

  it("keeps an explicit view transition opt-out", async () => {
    const router = appRouter();

    await router.navigate({ to: "/explore", replace: true, viewTransition: false });

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/explore");
  });
});

describe("skipped view transitions", () => {
  it("recognizes a transition the browser skipped, and nothing else", () => {
    const skipped = new DOMException("Transition was skipped", "AbortError");

    expect(isSkippedViewTransition(skipped)).toBe(true);
    expect(isSkippedViewTransition(new DOMException("The user aborted", "AbortError"))).toBe(false);
    expect(isSkippedViewTransition(new Error("Transition was skipped"))).toBe(false);
  });

  it("drops only skipped transitions from the unhandled rejections", () => {
    const stop = ignoreSkippedViewTransitions(window);
    const reject = (reason: unknown) => {
      const event = new Event("unhandledrejection", { cancelable: true });
      Object.assign(event, { reason });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(reject(new DOMException("Transition was skipped", "AbortError"))).toBe(true);
    expect(reject(new Error("boom"))).toBe(false);
    stop();
    expect(reject(new DOMException("Transition was skipped", "AbortError"))).toBe(false);
  });
});
