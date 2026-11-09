// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { InferencesPage } from "@/features/inferences/pages/inferences-page";
import { middleEllipsis } from "@/shared/lib/middle-ellipsis";
import { createRunName } from "@/features/schemas/lib/run-name";
import { click, mount } from "./support/dom";

const state = vi.hoisted(() => ({ deleted: [] as number[][] }));
const item = (id: number, name: string) => ({
  item: {
    id,
    name,
    status: "SUCCESS",
    origin: "WORKSPACE",
    createdAt: "2026-11-08T23:53:55Z",
    updatedAt: "2026-11-08T23:53:55Z",
    schemaId: 2,
    schemaName: "Risk",
    schemaVersionId: 7,
    schemaVersion: 1,
    schemaVersionName: null,
    bookmarkId: 5,
    bookmarkName: "production",
    createdByName: "Ada",
    createdByEmail: "ada@example.test",
  },
  feedbackStatus: "NONE",
  values: {},
});

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useWorkspaceContext: () => ({
    data: { currentOrganization: { id: 3 }, permissions: { canRunPredictions: true } },
  }),
}));
vi.mock("@/features/inferences/api/inference-catalog", () => ({
  useInferenceCatalogPage: () => ({
    data: { items: [item(1, "first run"), item(2, "second run")], totalItems: 2 },
    isLoading: false,
    isFetching: false,
    hasNextPage: false,
    error: null,
  }),
  useInferenceCatalogMetadata: () => ({
    data: { columns: [], totalItems: 2 },
    isLoading: false,
    error: null,
  }),
  inferenceSelectionQueryOptions: vi.fn(),
}));
vi.mock("@/features/inferences/api/inference-mutations", () => ({
  useDeleteInferenceMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useDeleteInferencesMutation: () => ({
    isPending: false,
    mutate: (ids: number[], options: { onSuccess: () => void }) => {
      state.deleted.push(ids);
      options.onSuccess();
    },
  }),
}));

const openPage = async () =>
  (
    await mount(null, {
      route: "/inferences",
      routes: { "/inferences": <InferencesPage /> },
    })
  ).host;
const deleteButton = (host: HTMLElement) =>
  [...host.querySelectorAll("button")].find((node) => node.textContent?.startsWith("Delete "));

describe("deleting inferences in bulk", () => {
  beforeEach(() => {
    state.deleted = [];
  });

  test("offers no bulk delete until rows are ticked, then deletes exactly those", async () => {
    const host = await openPage();
    expect(deleteButton(host)).toBeUndefined();

    await click(host.querySelector('[aria-label="Select second run"]')!);
    expect(deleteButton(host)?.textContent).toBe("Delete 1 selected");

    await click(deleteButton(host)!);
    expect(document.body.textContent).toContain("Delete 1 selected inference?");
    await click("Delete");

    expect(state.deleted).toEqual([[2]]);
    expect(deleteButton(host)).toBeUndefined();
  });
});

describe("run names", () => {
  test("a new run is named after its bookmark and the local time it ran", () => {
    const at = new Date(2026, 10, 9, 1, 1, 22);
    const name = createRunName("production", at);

    expect(name.startsWith("production · ")).toBe(true);
    expect(name).toContain("01:01:22");
    expect(name).not.toMatch(/Z$|T\d\d:/);
  });

  test("long names keep their start and their end", () => {
    expect(middleEllipsis("production-cardiology · 9 Nov, 01:01:22", 20)).toBe(
      "production… 01:01:22",
    );
    expect(middleEllipsis("short", 20)).toBe("short");
  });
});
