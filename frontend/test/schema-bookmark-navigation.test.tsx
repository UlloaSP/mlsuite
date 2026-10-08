/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { expect, test } from "vite-plus/test";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { mount } from "./support/dom";
import type { SchemaBookmarkDto } from "@/shared/api/openapi.gen";

const bookmark: SchemaBookmarkDto = {
  id: 1,
  schemaId: 1,
  schemaName: "Credit risk",
  versionId: 1,
  version: 1,
  versionName: "Snapshot 1",
  name: "Risk model",
  description: null,
  publicationNote: null,
  visibility: "PRIVATE",
  publicId: null,
  exampleCount: 0,
  staleExampleCount: 0,
  createdAt: "2026-09-24T12:00:00Z",
  updatedAt: "2026-09-24T12:00:00Z",
};

test("opening a bookmark in its schema goes straight to its Predict workspace", async () => {
  // The row reads the member's permissions; a loaded workspace context keeps it off the network.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  queryClient.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, {
    currentOrganization: { id: 1 },
    permissions: {},
  });
  const { host } = await mount(
    <Routes>
      <Route
        path="/schemas/:schemaId/bookmarks"
        element={<SchemaBookmarkCatalogItem bookmark={bookmark} />}
      />
      <Route path="/predict/:bookmarkId" element={<h1>Bookmark workspace</h1>} />
    </Routes>,
    { route: "/schemas/1/bookmarks", queryClient },
  );

  const tile = host.querySelector<HTMLAnchorElement>("article > a");
  const predictLink = [...host.querySelectorAll<HTMLAnchorElement>("article a")].find(
    (link) => link.textContent?.trim() === "Predict",
  );
  expect(tile?.getAttribute("href")).toBe("/predict/1");
  expect(predictLink?.getAttribute("href")).toBe("/predict/1");

  await act(async () => {
    tile?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  expect(host.textContent).toContain("Bookmark workspace");
});
