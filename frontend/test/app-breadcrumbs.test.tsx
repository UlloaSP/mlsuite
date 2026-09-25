/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { expect, test } from "vite-plus/test";
import { AppBreadcrumbs } from "@/shared/ui/AppBreadcrumbs";

test("shows every breadcrumb and wraps the trail instead of hiding steps", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AppBreadcrumbs
            items={[
              { label: "Schemas", to: "/schemas" },
              { label: "Risk schema", to: "/schemas/schema-1" },
              { label: "Bookmarks", to: "/schemas/schema-1/bookmarks" },
              { label: "Risk bookmark", to: "/schemas/schema-1/bookmarks/bookmark-1" },
              { label: "New inference" },
            ]}
          />
        </MemoryRouter>,
      );
    });

    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav?.textContent).toContain("Schemas");
    expect(nav?.textContent).toContain("Risk schema");
    expect(nav?.textContent).toContain("Bookmarks");
    expect(nav?.textContent).toContain("Risk bookmark");
    expect(nav?.textContent).toContain("New inference");
    expect(nav?.querySelector('[aria-haspopup="menu"]')).toBeNull();
    expect(nav?.querySelector("ol")?.classList.contains("flex-nowrap")).toBe(false);
  } finally {
    await act(async () => root.unmount());
  }
});
