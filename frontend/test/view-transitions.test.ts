// @vitest-environment jsdom

import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryClient } from "@tanstack/react-query";
import { createAppRouter } from "@/app/router/routes";

// jsdom has no View Transitions API; offering one shows whether the router would start it.
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

describe("page navigation", () => {
  it("shows the next page in place, without a view transition", async () => {
    const router = appRouter();

    await router.navigate({ to: "/explore" });
    await router.navigate({ to: "/explore", search: { q: "risk" }, replace: true });

    expect(router.options.defaultViewTransition).toBeUndefined();
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/explore");
  });
});
