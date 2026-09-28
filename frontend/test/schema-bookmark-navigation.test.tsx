/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, test } from "vite-plus/test";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type { SchemaBookmarkDto } from "@/features/schemas/api/schema-types";

const bookmark: SchemaBookmarkDto = {
  id: "bookmark-1",
  schemaId: "schema-1",
  schemaName: "Credit risk",
  versionId: "version-1",
  version: 1,
  versionName: "Snapshot 1",
  name: "Risk model",
  createdAt: "2026-09-24T12:00:00Z",
  updatedAt: "2026-09-24T12:00:00Z",
};

test("opening a bookmark in its schema goes straight to its Predict workspace", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/schemas/schema-1/bookmarks"]}>
          <Routes>
            <Route
              path="/schemas/:schemaId/bookmarks"
              element={<SchemaBookmarkCatalogItem bookmark={bookmark} />}
            />
            <Route path="/predict/:bookmarkId" element={<h1>Bookmark workspace</h1>} />
          </Routes>
        </MemoryRouter>,
      );
    });

    const tile = container.querySelector<HTMLAnchorElement>("article > a");
    const predictLink = [...container.querySelectorAll<HTMLAnchorElement>("article a")].find(
      (link) => link.textContent?.trim() === "Predict",
    );
    expect(tile?.getAttribute("href")).toBe("/predict/bookmark-1");
    expect(predictLink?.getAttribute("href")).toBe("/predict/bookmark-1");

    await act(async () => {
      tile?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain("Bookmark workspace");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
