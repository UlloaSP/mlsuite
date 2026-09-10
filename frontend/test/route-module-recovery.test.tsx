// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { expect, test, vi } from "vite-plus/test";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { classifyRouteError } from "@/app/router/route-error";
import { HttpError } from "@/shared/api/http";

test.each([
  "Failed to fetch dynamically imported module: /assets/old.js",
  "Importing a module script failed.",
  "error loading dynamically imported module: /assets/old.js",
])("module failure offers explicit reload: %s", async (message) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const status = classifyRouteError(new TypeError(message));
  expect(status).toBe("module-load");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const reload = vi.fn();
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <RouteStatusPage status={status} onReload={reload} />
        </MemoryRouter>,
      ),
    );
    expect(container.textContent).toContain("Page could not load");
    expect(container.textContent).not.toContain("Network unavailable");
    expect(reload).not.toHaveBeenCalled();
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Reload application")!
        .click(),
    );
    expect(reload).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

test.each([0, 403, 404, 500] as const)(
  "preserves status %s without module reload action",
  async (status) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    expect(
      classifyRouteError(
        new HttpError({ status, message: "request failed", path: "/", timestamp: "now" }),
      ),
    ).toBe(status);
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <MemoryRouter>
            <RouteStatusPage status={status} />
          </MemoryRouter>,
        ),
      );
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
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  },
);
