// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider, createStore } from "jotai";
import { act } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SchemaRunBulkUploadButton } from "@/features/schemas/components/SchemaRunBulkUploadButton";
import { InferenceSessionPanel } from "@/features/schemas/components/InferenceSessionPanel";
import { useInferenceSession } from "@/features/schemas/lib/use-inference-session";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";
import { binding, schemaVersion } from "./support/api-fixtures";
import { click, mount } from "./support/dom";

const state = vi.hoisted(() => ({
  submit: vi.fn(),
  persist: vi.fn(),
  save: vi.fn(),
  catalog: vi.fn(),
  userId: 7,
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: state.userId } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 1,
}));
vi.mock("@/features/schemas/api/schema-prediction-api", () => ({
  getLastPredictionRunId: async () => 0,
  createPredictionRunForBookmark: state.persist,
}));
vi.mock("@/features/schemas/api/schema-prediction-mutations", () => ({
  useCreatePredictionRunForBookmarkMutation: () => ({ mutateAsync: state.save }),
  invalidatePredictionRunCollections: vi.fn(),
}));
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  predictionCatalogQueryOptions: () => ({
    queryKey: ["catalog"],
    queryFn: state.catalog,
  }),
}));
vi.mock("@/capabilities/prediction-runtime/mlform/runtime-assembly", () => ({
  createSchemaRunRuntime: () => ({
    formSchema: { reports: [] },
    transport: { submit: state.submit },
  }),
}));

const version = schemaVersion({
  id: 23,
  formSchema: { fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }] },
  bindings: [binding(1)],
});
const completed = (age: number) => ({
  raw: {
    inputData: { age },
    results: [{ modelId: 1, modelInput: { age }, output: {}, status: "SUCCESS" }],
  },
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function BulkHarness({ snapshot = version }: { snapshot?: SchemaVersionDto }) {
  const session = useInferenceSession("bookmark-1", snapshot.id);
  return (
    <>
      <SchemaRunBulkUploadButton version={snapshot} onResult={session.addResult} />
      <InferenceSessionPanel session={session} selectedKey={null} onSelect={() => {}} />
    </>
  );
}

async function renderBulk() {
  const store = createStore();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = (visible = true, snapshot = version) => (
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <MemoryRouter>{visible ? <BulkHarness snapshot={snapshot} /> : null}</MemoryRouter>
      </Provider>
    </QueryClientProvider>
  );
  const view = await mount(render());
  return {
    ...view,
    show: (visible: boolean, snapshot = version) => view.rerender(render(visible, snapshot)),
  };
}

async function upload(host: HTMLElement, text: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([text], "bulk.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: async () => text });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    await flush();
  });
}

describe("bulk inference session", () => {
  beforeEach(() => {
    state.submit.mockReset();
    state.persist.mockReset();
    state.save.mockReset();
    state.userId = 7;
    state.catalog.mockReset();
    state.catalog.mockResolvedValue({ fieldDefinitions: [], reportDefinitions: [] });
    state.save.mockResolvedValue({ id: 99 });
    state.submit.mockImplementation(async (request) => completed(request.modelValues.age));
  });
  afterEach(() => vi.clearAllMocks());

  test("keeps each completed row unsaved until Save all is requested", async () => {
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55");
    expect(state.submit).toHaveBeenCalledTimes(2);
    expect(state.persist).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
    expect(host.querySelectorAll("aside li")).toHaveLength(2);
    expect(host.textContent).toContain("2 unsaved");
    expect(host.textContent).toContain("2 uploaded, 0 failed, 0 skipped");
    await click("Save all (2)", host);
    expect(state.save.mock.calls.map(([request]) => request)).toEqual([
      {
        schemaVersionId: 23,
        name: "first",
        inputData: { age: 42 },
        results: completed(42).raw.results,
      },
      {
        schemaVersionId: 23,
        name: "second",
        inputData: { age: 55 },
        results: completed(55).raw.results,
      },
    ]);
    expect(host.textContent).toContain("All saved");
  });

  test("keeps successful rows when another row fails or is skipped", async () => {
    state.submit.mockRejectedValueOnce(new Error("Runtime unavailable"));
    const { host } = await renderBulk();
    await upload(host, "name,age\nfailed,42\nskipped,invalid\nkept,55");
    expect(host.querySelectorAll("aside li")).toHaveLength(1);
    expect(host.textContent).toContain("1 uploaded, 1 failed, 1 skipped");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Inference name"]')?.value).toBe(
      "kept",
    );
    expect(state.persist).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });

  test("cancellation keeps completed rows and ignores an in-flight result", async () => {
    let finish!: (value: ReturnType<typeof completed>) => void;
    state.submit.mockResolvedValueOnce(completed(42));
    state.submit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55\nthird,60");
    await click(
      [...host.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Bulk 1/3"),
      )!,
    );
    await act(async () => {
      finish(completed(55));
      await flush();
    });
    expect(state.submit).toHaveBeenCalledTimes(2);
    expect(host.querySelectorAll("aside li")).toHaveLength(1);
    expect(host.textContent).toContain("1 uploaded, 0 failed, 0 skipped, 2 not processed");
  });

  test("leaving the page keeps completed entries and drops late results", async () => {
    let finish!: (value: ReturnType<typeof completed>) => void;
    state.submit.mockResolvedValueOnce(completed(42));
    state.submit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { host, show } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55");
    await show(false);
    await act(async () => {
      finish(completed(55));
      await flush();
    });
    await show(true);
    expect(state.submit).toHaveBeenCalledTimes(2);
    expect(host.querySelectorAll("aside li")).toHaveLength(1);
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Inference name"]')?.value).toBe(
      "first",
    );
    expect(state.persist).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });

  test("rejects an invalid header without running or storing rows", async () => {
    const { host } = await renderBulk();
    await upload(host, "name,unknown\nfirst,42");
    expect(state.submit).not.toHaveBeenCalled();
    expect(host.querySelectorAll("aside li")).toHaveLength(0);
    expect(state.persist).not.toHaveBeenCalled();
  });

  test("a catalog failure leaves the session untouched and allows retry", async () => {
    state.catalog.mockRejectedValueOnce(new Error("Catalog unavailable"));
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42");
    expect(state.submit).not.toHaveBeenCalled();
    expect(host.querySelectorAll("aside li")).toHaveLength(0);
    await upload(host, "name,age\nfirst,42");
    expect(host.querySelectorAll("aside li")).toHaveLength(1);
    expect(state.persist).not.toHaveBeenCalled();
  });

  test.each(["snapshot", "member"])("a change of %s drops in-flight results", async (change) => {
    let finish!: (value: ReturnType<typeof completed>) => void;
    state.submit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { host, show } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55");
    if (change === "member") state.userId = 8;
    await show(true, change === "snapshot" ? { ...version, id: 24 } : version);
    await act(async () => {
      finish(completed(42));
      await flush();
    });
    expect(state.submit).toHaveBeenCalledTimes(1);
    expect(host.querySelectorAll("aside li")).toHaveLength(0);
    expect(state.persist).not.toHaveBeenCalled();
  });

  test("generates distinct names for repeated unnamed uploads", async () => {
    const { host } = await renderBulk();
    await upload(host, "age\n42");
    await upload(host, "age\n55");
    const names = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Inference name"]'),
    ].map((input) => input.value);
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(state.persist).not.toHaveBeenCalled();
  });
});
