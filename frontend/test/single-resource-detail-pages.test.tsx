// @vitest-environment jsdom
import { act } from "react";
import { QueryClient } from "@tanstack/react-query";
import { Route, Routes } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { InferenceDetailPage } from "@/features/inferences/pages/inference-detail-page";
import { ModelDetailPage } from "@/features/models/pages/model-detail-page";
import { HttpError } from "@/shared/api/http";
import { LOADING_MIN_VISIBLE_MS, LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";
import { mount } from "./support/dom";

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
    Page: () => <InferenceDetailPage renderData={() => null} />,
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

afterEach(() => {
  fetchState.appFetch.mockReset();
});

async function renderPage({ Page, path, url }: (typeof pages)[keyof typeof pages]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await mount(
    <Routes>
      <Route path={path} element={<Page />} />
    </Routes>,
    { route: url, queryClient },
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  // Let useStableLoading release the skeleton once the response has rendered.
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, LOADING_REVEAL_DELAY_MS + LOADING_MIN_VISIBLE_MS),
    );
  });
  return view;
}

test.each(Object.entries(pages))("%s detail requests only its own record", async (_, page) => {
  fetchState.appFetch.mockResolvedValue(page.record);
  const { host } = await renderPage(page);

  expect(fetchState.appFetch.mock.calls.map(([path]) => path)).toEqual([page.request]);
  expect(host.querySelector("h1")?.textContent).toBe(page.record.name);
});

test.each(Object.entries(pages))(
  "%s detail tells a missing record from a failed request",
  async (_, page) => {
    fetchState.appFetch.mockRejectedValue(httpError(404));
    const missing = await renderPage(page);
    expect(missing.host.textContent).toContain(page.missing);
    await missing.unmount();

    fetchState.appFetch.mockRejectedValue(httpError(500));
    const { host } = await renderPage(page);
    expect(host.textContent).toContain(page.failed);
    expect(host.querySelector("h1")).toBeNull();
  },
);
