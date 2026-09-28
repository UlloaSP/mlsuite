/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { PredictPage } from "@/features/schemas/pages/predict-page";
import { BookmarkWorkspacePage } from "@/features/schemas/pages/bookmark-workspace-page";
import type { PredictBookmarkDto, SchemaBookmarkDto } from "@/features/schemas/api/schema-types";
import { click, mount } from "./support/dom";

const state = vi.hoisted(() => ({
  canRun: true,
  bookmarks: [] as PredictBookmarkDto[],
  bookmark: undefined as SchemaBookmarkDto | undefined,
  requestedVersions: [] as Array<string | undefined>,
}));

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ data: { permissions: { canRunPredictions: state.canRun } } }),
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: "user-1" } }),
}));
vi.mock("@/features/schemas/api/schema-prediction-mutations", () => ({
  useCreatePredictionRunForBookmarkMutation: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useOrganizationBookmarks: () => ({
    data: state.bookmarks,
    error: null,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSchemaBookmark: () => ({ data: state.bookmark, isError: false }),
  useSchemaVersion: (versionId?: string) => {
    state.requestedVersions.push(versionId);
    return {
      data: versionId
        ? {
            id: versionId,
            schemaId: "schema-1",
            name: `Snapshot ${versionId}`,
            version: Number(versionId),
            bindings: [],
            formSchema: { fields: [], reports: [] },
            createdAt: "",
          }
        : undefined,
      isError: false,
      refetch: vi.fn(),
    };
  },
}));
vi.mock("@/features/schemas/components/BookmarkPredictPanel", () => ({
  BookmarkPredictPanel: ({ version }: { version: { id: string } }) => (
    <p>Form for snapshot {version.id}</p>
  ),
}));
vi.mock("@/features/schemas/components/SchemaRunBulkUploadButton", () => ({
  SchemaRunBulkUploadButton: () => null,
}));

const launcherEntry = (
  id: string,
  name: string,
  schemaName: string,
  extra: Partial<PredictBookmarkDto> = {},
): PredictBookmarkDto => ({
  id,
  name,
  schemaId: `schema-${id}`,
  schemaName,
  schemaDescription: null,
  versionId: "1",
  version: 1,
  versionName: "Snapshot 1",
  latestVersion: 1,
  models: [],
  fieldCount: 0,
  reportCount: 0,
  runCount: 0,
  lastRunAt: null,
  updatedAt: "2026-09-24T12:00:00Z",
  ...extra,
});

const bookmark = (id: string, name: string, schemaName: string): SchemaBookmarkDto => ({
  id,
  schemaId: `schema-${id}`,
  schemaName,
  versionId: "1",
  version: 1,
  versionName: "Snapshot 1",
  name,
  createdAt: "2026-09-24T12:00:00Z",
  updatedAt: "2026-09-24T12:00:00Z",
});

function InferencesProbe() {
  return <p>Inferences {useLocation().search}</p>;
}

let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(state, { canRun: true, bookmarks: [], bookmark: undefined, requestedVersions: [] });
});

async function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/predict", element: <PredictPage /> },
      { path: "/inferences", element: <InferencesProbe /> },
      {
        path: "/predict/:bookmarkId",
        element: <BookmarkWorkspacePage />,
      },
    ],
    { initialEntries: [path] },
  );
  ({ host: container } = await mount(<RouterProvider router={router} />));
  return router;
}

test("lists the organization's bookmarks as cards that say what they run", async () => {
  state.bookmarks = [
    launcherEntry("2", "production", "Transplant", {
      schemaDescription: "Kidney graft outcome",
      models: ["Forest", "Boost", "Linear", "Tree"],
      fieldCount: 12,
      reportCount: 3,
      runCount: 24,
      lastRunAt: "2026-09-24T11:00:00Z",
    }),
    launcherEntry("1", "staging", "Credit risk", { latestVersion: 2 }),
  ];
  await renderAt("/predict");

  const cards = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="/predict/"]')];
  expect(cards.map((card) => card.querySelector("h2")?.textContent)).toEqual([
    "staging",
    "production",
  ]);
  expect(cards[0].textContent).toContain("v2 is available");
  expect(cards[1].getAttribute("href")).toBe("/predict/2");
  expect(cards[1].textContent).toContain("Kidney graft outcome");
  expect(cards[1].textContent).toContain("+1");
  expect(cards[1].textContent).toContain("Inputs12");
  expect(cards[1].textContent).toContain("Inferences24");
  expect(cards[1].textContent).toContain("Last run");

  await click("Update available", container);
  expect(
    [...container.querySelectorAll('a[href^="/predict/"] h2')].map((item) => item.textContent),
  ).toEqual(["staging"]);
});

test("explains where bookmarks come from when there are none", async () => {
  await renderAt("/predict");
  expect(container.textContent).toContain("Nothing to run yet");
  expect(container.querySelector('a[href="/schemas"]')).not.toBeNull();
});

test("pins the snapshot the page opened with and offers to switch when the bookmark moves", async () => {
  state.bookmark = bookmark("7", "production", "Transplant");
  const router = await renderAt("/predict/7");
  expect(container.textContent).toContain("Form for snapshot 1");
  expect(container.textContent).toContain("Transplant · Snapshot 1 · v1");

  state.bookmark = { ...state.bookmark, versionId: "2", version: 2 };
  // Any re-render (here a URL change) sees the moved bookmark.
  await act(async () => router.navigate("/predict/7?from=9"));
  expect(container.textContent).toContain("now points to v2");
  expect(state.requestedVersions.at(-1)).toBe("1");

  await act(async () => router.navigate("/predict/7"));
  await click("Use v2", container);
  expect(container.textContent).toContain("Form for snapshot 2");
  expect(container.textContent).not.toContain("now points to");
});

test("members who cannot run predictions only see the history", async () => {
  state.canRun = false;
  state.bookmark = bookmark("7", "production", "Transplant");
  await renderAt("/predict/7");
  expect(container.textContent).toContain("Inferences ?schema=schema-7&bookmark=7");
  expect(container.textContent).not.toContain("Form for snapshot");
});

test("history is the Inferences catalog filtered to the bookmark", async () => {
  state.bookmark = bookmark("7", "production", "Transplant");
  await renderAt("/predict/7");
  expect(container.querySelector('[role="tablist"]')).toBeNull();
  const history = container.querySelector<HTMLAnchorElement>('a[href^="/inferences"]');
  expect(history?.textContent).toContain("History");
  expect(history?.getAttribute("href")).toBe("/inferences?schema=schema-7&bookmark=7");
  expect(container.querySelector('a[href="/schemas/schema-7"]')).not.toBeNull();
});
