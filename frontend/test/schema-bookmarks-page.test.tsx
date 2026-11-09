// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SchemaBookmarksPage } from "@/features/schemas/pages/schema-bookmarks-page";
import { click, mount } from "./support/dom";

const state = vi.hoisted(() => ({ snapshots: [] as Array<{ id: number; version: number }> }));
const page = (items: unknown[]) => ({
  data: { items, totalItems: items.length },
  hasNextPage: false,
  isFetching: false,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  fetchNextPage: vi.fn(),
});

vi.mock("@/features/schemas/api/schema-catalog-queries", () => ({
  useBookmarkCatalog: () => page([]),
  useSnapshotCatalog: (_schemaId: string, controls: { filter: string }) =>
    page(controls.filter === "latest" ? state.snapshots : []),
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchema: () => ({ data: { id: 4, name: "Risk" } }),
}));
vi.mock("@/features/schemas/components/SchemaRepoNav", () => ({ SchemaRepoNav: () => null }));
vi.mock("@/features/schemas/components/BookmarkSnapshotDialog", () => ({
  BookmarkSnapshotDialog: ({ version }: { version: { version: number } | null }) =>
    version ? <div role="dialog">Bookmark v{version.version}</div> : null,
}));

const openPage = async () =>
  (
    await mount(null, {
      route: "/schemas/4/bookmarks",
      routes: { "/schemas/$schemaId/bookmarks": <SchemaBookmarksPage /> },
    })
  ).host;

describe("a schema without bookmarks", () => {
  beforeEach(() => {
    state.snapshots = [];
  });

  test("offers to bookmark its newest snapshot", async () => {
    state.snapshots = [{ id: 12, version: 3 }];
    const host = await openPage();

    await click("Bookmark latest snapshot", host);

    expect(host.querySelector('[role="dialog"]')?.textContent).toBe("Bookmark v3");
  });

  test("with no snapshot yet, says to publish one first and offers no bookmark", async () => {
    const host = await openPage();

    expect(host.textContent).toContain("Publish a change to create a snapshot");
    expect(host.textContent).not.toContain("Bookmark latest snapshot");
  });
});
