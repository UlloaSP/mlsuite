// @vitest-environment jsdom
import { act } from "react";
import { expect, test, vi } from "vite-plus/test";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { classifyRouteError } from "@/app/router/route-error";
import { HttpError } from "@/shared/api/http";
import { click, mount } from "./support/dom";

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
