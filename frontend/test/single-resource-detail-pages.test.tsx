// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { InferenceDetailPage } from "@/features/inferences/pages/inference-detail-page";
import { ModelDetailPage } from "@/features/models/pages/model-detail-page";
import { HttpError } from "@/shared/api/http";
import { LOADING_MIN_VISIBLE_MS, LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";

const fetchState = vi.hoisted(() => ({
  appFetch: vi.fn<(path: string) => Promise<unknown>>(),
}));
vi.mock("@/shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/http")>()),
  appFetch: (path: string) => fetchState.appFetch(path),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
  useWorkspaceContext: () => ({ data: { permissions: {} } }),
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 1 }, error: null }),
}));
vi.mock("@/features/models/components/ModelSummaryTab", () => ({ ModelSummaryTab: () => null }));

const httpError = (status: number) =>
  new HttpError({ status, message: "failed", path: "/api", timestamp: "2026-09-28T00:00:00Z" });

const pages = {
  model: {
    Page: ModelDetailPage,
    path: "/models/:modelId",
    url: "/models/12",
    request: "/api/models/12",
    record: {
      id: 12,
      name: "Churn model",
      type: "sklearn",
      specificType: "RandomForest",
      createdAt: "2026-09-28T00:00:00Z",
    },
    missing: "Model not found",
    failed: "Model unavailable",
  },
  inference: {
    Page: InferenceDetailPage,
    path: "/inferences/:inferenceId",
    url: "/inferences/31",
    request: "/api/prediction-runs/31/summary",
    record: {
      id: 31,
      name: "Churn check",
      status: "SUCCESS",
      createdAt: "2026-09-28T00:00:00Z",
      schemaId: 2,
      schemaName: "Churn",
      schemaVersionId: 3,
      schemaVersion: 1,
      schemaVersionName: "Initial",
    },
    missing: "Inference unavailable",
    failed: "Inference unavailable",
  },
};

let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  fetchState.appFetch.mockReset();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function mount({ Page, path, url }: (typeof pages)[keyof typeof pages]) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path={path} element={<Page />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  // Let useStableLoading release the skeleton once the response has rendered.
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, LOADING_REVEAL_DELAY_MS + LOADING_MIN_VISIBLE_MS),
    );
  });
}

test.each(Object.entries(pages))("%s detail requests only its own record", async (_, page) => {
  fetchState.appFetch.mockResolvedValue(page.record);
  await mount(page);

  expect(fetchState.appFetch.mock.calls.map(([path]) => path)).toEqual([page.request]);
  expect(container.querySelector("h1")?.textContent).toBe(page.record.name);
});

test.each(Object.entries(pages))(
  "%s detail tells a missing record from a failed request",
  async (_, page) => {
    fetchState.appFetch.mockRejectedValue(httpError(404));
    await mount(page);
    expect(container.textContent).toContain(page.missing);
    await act(async () => root?.unmount());

    fetchState.appFetch.mockRejectedValue(httpError(500));
    await mount(page);
    expect(container.textContent).toContain(page.failed);
    expect(container.querySelector("h1")).toBeNull();
  },
);
