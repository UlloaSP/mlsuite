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
  versionId: "version-1",
  version: 1,
  versionName: "Snapshot 1",
  name: "Risk model",
  createdAt: "2026-09-24T12:00:00Z",
  updatedAt: "2026-09-24T12:00:00Z",
};

test("opening a bookmark tile goes straight to the run page", async () => {
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
              element={<SchemaBookmarkCatalogItem bookmark={bookmark} schemaId="schema-1" />}
            />
            <Route
              path="/schemas/:schemaId/bookmarks/:bookmarkId"
              element={<h1>Bookmark detail</h1>}
            />
            <Route
              path="/schemas/:schemaId/bookmarks/:bookmarkId/runs/create"
              element={<h1>Create run</h1>}
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    const tile = container.querySelector<HTMLAnchorElement>("article > a");
    const runLink = [...container.querySelectorAll<HTMLAnchorElement>("article a")].find(
      (link) => link.textContent?.trim() === "Run",
    );
    expect(tile).not.toBeNull();
    expect(runLink?.getAttribute("href")).toBe(
      "/schemas/schema-1/bookmarks/bookmark-1/runs/create",
    );

    await act(async () => {
      tile?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain("Create run");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
