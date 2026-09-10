// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { SchemaDetailPage } from "@/features/schemas/pages/schema-detail-page";
import { PredictionRunDetailPage } from "@/features/schemas/pages/prediction-run-detail-page";

const state = vi.hoisted(() => ({
  query: { data: undefined as unknown, isLoading: false, isError: false },
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({
    data: { permissions: { canRunPredictions: true, canViewOrganization: true } },
  }),
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchema: () => state.query,
  usePredictionRun: () => state.query,
  useSchemaVersions: () => ({ data: [] }),
  useSchemaBookmarks: () => ({ data: [] }),
  useSchemaDrafts: () => ({ data: [] }),
  useSchemaBookmark: () => ({}),
  useSchemaVersion: () => ({}),
  usePredictionRunFeedback: () => ({ data: [] }),
}));
vi.mock("@/features/schemas/api/schema-draft-mutations", () => ({
  useCreateSchemaDraftMutation: () => ({ isPending: false }),
}));
vi.mock("@/features/schemas/lib/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => ({ data: { reportDefinitions: [] } }),
}));
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

test.each([
  ["schema", SchemaDetailPage, "/schemas", "No published snapshots"],
  ["run", PredictionRunDetailPage, "/inferences", "Predict again"],
] as const)(
  "%s distinguishes loading, missing/error and loaded data",
  async (kind, Page, back, success) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const render = () =>
      root?.render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>,
      );
    state.query = { data: undefined, isLoading: true, isError: false };
    await act(async () => render());
    expect(container.textContent).toContain("Loading");
    expect(container.textContent).not.toContain("unavailable");
    for (const isError of [false, true]) {
      state.query = { data: undefined, isLoading: false, isError };
      await act(async () => render());
      expect(container.textContent).toContain("unavailable");
      expect(container.querySelector("a")?.getAttribute("href")).toBe(back);
      expect(container.textContent).not.toContain(success);
    }
    state.query = {
      data: { id: "1", name: "Loaded record", results: [] },
      isLoading: false,
      isError: false,
    };
    await act(async () => render());
    expect(container.textContent).toContain("Loaded record");
    expect(container.textContent).not.toContain("unavailable");
    if (kind === "run") expect(container.textContent).toContain(success);
  },
);
