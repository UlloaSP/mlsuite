// @vitest-environment jsdom
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
