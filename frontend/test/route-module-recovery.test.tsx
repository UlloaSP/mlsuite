// @vitest-environment jsdom
import { act } from "react";
import { getDefaultStore } from "jotai";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test, vi } from "vite-plus/test";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { RouteErrorBoundary } from "@/app/router/RouteErrorBoundary";
import { classifyRouteError } from "@/app/router/route-error";
import { HttpError } from "@/shared/api/http";
import {
  inferenceSessionsAtom,
  useWarnOnUnsavedInferences,
} from "@/features/schemas/lib/inference-session-store";
import { click, mount } from "./support/dom";

vi.mock("@/capabilities/workspace-context/session", () => ({
  SIGN_IN_PATH: "/login",
  useUser: () => ({ data: undefined }),
}));

function SessionPage() {
  useWarnOnUnsavedInferences();
  return <p>Session ready</p>;
}

test("a root module failure keeps the reload warning for unsaved inferences", async () => {
  const store = getDefaultStore();
  store.set(inferenceSessionsAtom, {
    "1:bookmark": [
      {
        key: "run-1",
        schemaVersionId: 1,
        name: "Unsaved",
        state: "ready",
        inputData: {},
        results: [],
        reportsPending: false,
        createdAt: "2026-10-10T00:00:00Z",
      },
    ],
  });
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: "/ready", element: <SessionPage /> },
          {
            path: "/missing",
            lazy: async () => {
              throw new TypeError("Failed to fetch dynamically imported module: /assets/old.js");
            },
          },
        ],
      },
    ],
    { initialEntries: ["/ready"] },
  );
  try {
    const view = await mount(<RouterProvider router={router} />);
    const warns = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(warns()).toBe(true);
    await act(async () => router.navigate("/missing"));
    expect(view.host.textContent).toContain("Page could not load");
    expect(warns()).toBe(true);
    expect(store.get(inferenceSessionsAtom)["1:bookmark"]).toHaveLength(1);
    await act(async () => store.set(inferenceSessionsAtom, {}));
    expect(warns()).toBe(false);
  } finally {
    store.set(inferenceSessionsAtom, {});
    router.dispose();
  }
});

test.each([
  "Failed to fetch dynamically imported module: /assets/old.js",
  "Importing a module script failed.",
  "error loading dynamically imported module: /assets/old.js",
])("module failure offers explicit reload: %s", async (message) => {
  const status = classifyRouteError(new TypeError(message));
  expect(status).toBe("module-load");
  const reload = vi.fn();
  const { host: container } = await mount(<RouteStatusPage status={status} onReload={reload} />, {
    route: "/",
  });
  expect(container.textContent).toContain("Page could not load");
  expect(container.textContent).not.toContain("Network unavailable");
  expect(reload).not.toHaveBeenCalled();
  await click("Reload application", container);
  expect(reload).toHaveBeenCalledOnce();
});

test.each([0, 403, 404, 500] as const)(
  "preserves status %s without module reload action",
  async (status) => {
    expect(
      classifyRouteError(
        new HttpError({ status, message: "request failed", path: "/", timestamp: "now" }),
      ),
    ).toBe(status);
    const { host: container } = await mount(<RouteStatusPage status={status} />, { route: "/" });
    expect(container.textContent).not.toContain("Reload application");
    expect(container.textContent).toContain(
      status === 0
        ? "Network unavailable"
        : status === 403
          ? "Access denied"
          : status === 404
            ? "Route not found"
            : "Something went wrong",
    );
  },
);

test("a page that could not load reloads itself every five seconds, and no other status does", async () => {
  vi.useFakeTimers();
  try {
    const reload = vi.fn();
    // One tick at a time: each second is scheduled by the render of the one before it.
    const seconds = async (count: number) => {
      for (let tick = 0; tick < count; tick += 1) {
        await act(async () => vi.advanceTimersByTimeAsync(1000));
      }
    };
    const view = await mount(<RouteStatusPage status="module-load" onReload={reload} />, {
      route: "/",
    });
    expect(view.host.textContent).toContain("reloads automatically in 5 seconds");
    await seconds(4);
    expect(view.host.textContent).toContain("reloads automatically in 1 second.");
    expect(reload).not.toHaveBeenCalled();
    await seconds(1);
    expect(reload).toHaveBeenCalledOnce();
    await seconds(5);
    expect(reload).toHaveBeenCalledTimes(2);

    await view.rerender(<RouteStatusPage status={404} onReload={reload} />);
    expect(view.host.textContent).not.toContain("reloads automatically");
    await seconds(10);
    expect(reload).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});
