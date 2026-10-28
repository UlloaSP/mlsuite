// @vitest-environment jsdom

import { act } from "react";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { modelKeys } from "@/features/models/api/model.keys";
import {
  MODEL_PREPARING_POLL_MS,
  modelQueryOptions,
  useModelCatalogPageQuery,
} from "@/features/models/api/model.queries";
import { ModelEnvironmentFailure } from "@/features/models/components/ModelEnvironmentFailure";
import { ModelListItem } from "@/features/models/components/ModelListItem";
import { ModelDetailPage } from "@/features/models/pages/model-detail-page";
import { SchemaModelOption } from "@/features/schemas/components/SchemaModelOption";
import { HttpError } from "@/shared/api/http";
import type { ModelDto, RuntimeEnvironmentDto } from "@/shared/api/openapi.gen";
import { LOADING_MIN_VISIBLE_MS, LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";
import { click, mount } from "./support/dom";

const mocks = vi.hoisted(() => ({
  appFetch: vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(),
  success: vi.fn(),
  canEditModels: true,
}));
vi.mock("@/shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/http")>()),
  appFetch: (path: string, init?: RequestInit) => mocks.appFetch(path, init),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn() } }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
  useWorkspaceContext: () => ({
    data: { permissions: { canEditModels: mocks.canEditModels }, currentOrganization: { id: 7 } },
  }),
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 1 }, error: null }),
}));

const model = (overrides: Partial<ModelDto> = {}): ModelDto => ({
  archivedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  fieldCount: 1,
  fileName: "risk.mlbundle",
  id: 12,
  inputSchema: { fields: [] },
  name: "Risk",
  reportCount: 1,
  runtimeError: null,
  runtimeState: "READY",
  specificType: "LogisticRegression",
  type: "classifier",
  updatedAt: "2026-10-02T10:00:00Z",
  updatedByAvatarUrl: null,
  updatedByEmail: "ada@example.com",
  updatedByName: "Ada",
  version: 1,
  ...overrides,
});

const NUMPY_REFUSED = "The environment needs packages MLsuite does not install: numpy==9.9.9";

const locked: RuntimeEnvironmentDto = {
  key: "env-locked",
  legacy: false,
  pythonVersion: "3.12.7",
  writerVersion: "0.3.0",
  packages: [{ name: "scikit-learn", version: "1.5.2" }],
};

const conflict = new HttpError({
  status: 409,
  message: "Only a model whose environment could not be prepared can be prepared again.",
  path: "/api/models/12/environment/retry",
  timestamp: "2026-10-02T10:00:00Z",
});

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

beforeEach(() => {
  mocks.canEditModels = true;
});

afterEach(() => {
  mocks.appFetch.mockReset();
  mocks.success.mockReset();
  vi.useRealTimers();
});

test.each([
  ["PREPARING", "Preparing environment"],
  ["FAILED", "Environment failed"],
] as const)("a %s model is badged in the catalog", async (runtimeState, label) => {
  const { host } = await mount(
    <ModelListItem
      canDelete={false}
      canDuplicate={false}
      canEdit={false}
      item={model({ runtimeState, runtimeError: runtimeState === "FAILED" ? NUMPY_REFUSED : null })}
      schemaCount={1}
      to="/models/12"
      onAction={vi.fn()}
    />,
    { route: "/models" },
  );

  expect(host.textContent).toContain(label);
  expect(host.textContent?.includes(NUMPY_REFUSED)).toBe(runtimeState === "FAILED");
});

test("a ready model carries no environment badge in the catalog or the schema picker", async () => {
  const { host } = await mount(
    <>
      <ModelListItem
        canDelete={false}
        canDuplicate={false}
        canEdit={false}
        item={model()}
        schemaCount={1}
        to="/models/12"
        onAction={vi.fn()}
      />
      <SchemaModelOption available model={model()} selected={false} onToggle={vi.fn()} />
    </>,
    { route: "/models" },
  );

  expect(host.textContent).not.toContain("Preparing environment");
  expect(host.textContent).not.toContain("Environment failed");
});

test("the schema picker badges a model that is still being prepared and lets it be chosen", async () => {
  const onToggle = vi.fn();
  const { host } = await mount(
    <SchemaModelOption
      available
      model={model({ runtimeState: "PREPARING" })}
      selected={false}
      onToggle={onToggle}
    />,
  );

  expect(host.textContent).toContain("Preparing environment");
  await click(host.querySelector("button")!);
  expect(onToggle).toHaveBeenCalled();
});

test("a model is read again while it is prepared, then polling stops and its details refresh", async () => {
  vi.useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(modelKeys.bundle(7, 12), { featureImportances: null });
  mocks.appFetch
    .mockResolvedValueOnce(model({ runtimeState: "PREPARING" }))
    .mockResolvedValueOnce(model({ runtimeState: "PREPARING" }))
    .mockResolvedValue(model({ runtimeState: "READY" }));
  const unsubscribe = new QueryObserver(client, modelQueryOptions(7, 12)).subscribe(() => {});

  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.appFetch).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(modelKeys.bundle(7, 12))?.isInvalidated).toBe(false);
  await vi.advanceTimersByTimeAsync(MODEL_PREPARING_POLL_MS * 2);
  expect(mocks.appFetch).toHaveBeenCalledTimes(3);
  expect(client.getQueryData<ModelDto>(modelKeys.detail(7, 12))?.runtimeState).toBe("READY");
  expect(client.getQueryState(modelKeys.bundle(7, 12))?.isInvalidated).toBe(true);

  await vi.advanceTimersByTimeAsync(MODEL_PREPARING_POLL_MS * 4);
  expect(mocks.appFetch).toHaveBeenCalledTimes(3);
  unsubscribe();
});

test("the catalog polls only while a loaded model is being prepared", async () => {
  vi.useFakeTimers();
  const page = (runtimeState: ModelDto["runtimeState"]) => ({
    items: [model({ runtimeState })],
    page: 0,
    size: 24,
    totalItems: 1,
    hasNext: false,
  });
  mocks.appFetch.mockResolvedValueOnce(page("PREPARING")).mockResolvedValue(page("FAILED"));
  function Catalog() {
    const query = useModelCatalogPageQuery(7, "", "updated", "active");
    return <p>{query.data?.items[0]?.runtimeState}</p>;
  }
  const { host } = await mount(<Catalog />);

  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(host.textContent).toBe("PREPARING");
  // The extra millisecond lets Query's batched notification reach React.
  await act(() => vi.advanceTimersByTimeAsync(MODEL_PREPARING_POLL_MS + 1));
  expect(host.textContent).toBe("FAILED");
  await act(() => vi.advanceTimersByTimeAsync(MODEL_PREPARING_POLL_MS * 4));
  expect(mocks.appFetch).toHaveBeenCalledTimes(2);
});

async function openFailedModel() {
  mocks.appFetch.mockImplementation(async (path) =>
    path === "/api/models/12"
      ? model({ runtimeState: "FAILED", runtimeError: NUMPY_REFUSED })
      : {
          manifest: {},
          featureImportances: null,
          sizeBytes: null,
          sha256: null,
          environment: locked,
        },
  );
  const view = await mount(
    <Routes>
      <Route path="/models/:modelId" element={<ModelDetailPage />} />
    </Routes>,
    { route: "/models/12" },
  );
  await settle();
  // Let useStableLoading release the skeleton once the response has rendered.
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, LOADING_REVEAL_DELAY_MS + LOADING_MIN_VISIBLE_MS),
    );
  });
  return view.host;
}

test("the model page shows why a model failed and offers to prepare it again", async () => {
  const host = await openFailedModel();

  expect(host.querySelector("h1")?.textContent).toContain("Environment failed");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(NUMPY_REFUSED);
  expect(host.textContent).toContain("Prepare again");
});

test("preparing again needs the edit-models permission", async () => {
  mocks.canEditModels = false;
  const host = await openFailedModel();

  expect(host.querySelector('[role="alert"]')?.textContent).toContain(NUMPY_REFUSED);
  expect(host.textContent).not.toContain("Prepare again");
});

test("preparing again puts the model back to preparing in its caches", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(modelKeys.detail(7, 12), model({ runtimeState: "FAILED" }));
  mocks.appFetch.mockImplementation(async (_path, init) =>
    init?.method === "POST" ? model({ runtimeState: "PREPARING" }) : undefined,
  );
  const { host } = await mount(
    <ModelEnvironmentFailure model={model({ runtimeState: "FAILED" })} canRetry />,
    { queryClient: client },
  );

  await click("Prepare again", host);
  await settle();

  expect(mocks.appFetch).toHaveBeenCalledWith("/api/models/12/environment/retry", {
    method: "POST",
  });
  expect(client.getQueryData<ModelDto>(modelKeys.detail(7, 12))?.runtimeState).toBe("PREPARING");
  expect(client.getQueryState(modelKeys.detail(7, 12))?.isInvalidated).toBe(true);
  expect(mocks.success).toHaveBeenCalledWith("Preparing the model's environment again.");
});

test("a refused retry (409) keeps the cached model and refreshes it", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(modelKeys.detail(7, 12), model({ runtimeState: "FAILED" }));
  mocks.appFetch.mockRejectedValue(conflict);
  const { host } = await mount(
    <ModelEnvironmentFailure model={model({ runtimeState: "FAILED" })} canRetry />,
    { queryClient: client },
  );

  await click("Prepare again", host);
  await settle();

  expect(client.getQueryData<ModelDto>(modelKeys.detail(7, 12))?.runtimeState).toBe("FAILED");
  expect(client.getQueryState(modelKeys.detail(7, 12))?.isInvalidated).toBe(true);
  expect(mocks.success).not.toHaveBeenCalled();
  expect(host.querySelector("button")?.disabled).toBe(false);
});
