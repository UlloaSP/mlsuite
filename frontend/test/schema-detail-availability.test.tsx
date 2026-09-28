// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { SchemaDetailPage } from "@/features/schemas/pages/schema-detail-page";
import { LOADING_MIN_VISIBLE_MS, LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";
import { mount } from "./support/dom";

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
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => ({ data: { reportDefinitions: [] } }),
}));
afterEach(() => {
  vi.useRealTimers();
});

test.each([["schema", SchemaDetailPage, "/schemas", "No published snapshots"]] as const)(
  "%s distinguishes loading, missing/error and loaded data",
  async (_kind, Page, back, success) => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    state.query = { data: undefined, isLoading: true, isError: false };
    const { host: container, rerender } = await mount(<Page />, { route: "/" });
    expect(container.textContent).toContain("Loading");
    expect(container.textContent).not.toContain("unavailable");
    void act(() => vi.advanceTimersByTime(LOADING_REVEAL_DELAY_MS + 1));
    for (const isError of [false, true]) {
      state.query = { data: undefined, isLoading: false, isError };
      await rerender(<Page />);
      if (!isError) {
        expect(container.textContent).toContain("Loading");
        void act(() => vi.advanceTimersByTime(LOADING_REVEAL_DELAY_MS + LOADING_MIN_VISIBLE_MS));
      }
      expect(container.textContent).toContain("unavailable");
      expect(container.querySelector("a")?.getAttribute("href")).toBe(back);
      expect(container.textContent).not.toContain(success);
    }
    state.query = {
      data: { id: "1", name: "Loaded record", results: [] },
      isLoading: false,
      isError: false,
    };
    await rerender(<Page />);
    expect(container.textContent).toContain("Loaded record");
    expect(container.textContent).not.toContain("unavailable");
  },
  15_000,
);
