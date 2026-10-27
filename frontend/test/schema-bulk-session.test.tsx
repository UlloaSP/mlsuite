// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider, createStore } from "jotai";
import { act } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SchemaRunBulkUploadButton } from "@/features/schemas/components/SchemaRunBulkUploadButton";
import { InferenceSessionPanel } from "@/features/schemas/components/InferenceSessionPanel";
import { useInferenceSession } from "@/features/schemas/lib/use-inference-session";
import type { SchemaVersionDto, WorkspacePredictionDto } from "@/shared/api/openapi.gen";
import { binding, schemaVersion } from "./support/api-fixtures";
import { click, mount } from "./support/dom";

type Batch = (
  target: unknown,
  bindings: unknown,
  fields: unknown,
  records: { age: number }[],
  signal?: AbortSignal,
) => Promise<WorkspacePredictionDto[][]>;

const state = vi.hoisted(() => ({
  batch: vi.fn<Batch>(),
  saveMany: vi.fn(),
  save: vi.fn(),
  catalog: vi.fn(),
  userId: 7,
}));
const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: state.userId } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 1,
}));
vi.mock("@/features/schemas/api/schema-prediction-mutations", () => ({
  useCreatePredictionRunForBookmarkMutation: () => ({ mutateAsync: state.save }),
  useCreatePredictionRunsForBookmarkMutation: () => ({ mutateAsync: state.saveMany }),
}));
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  predictionCatalogQueryOptions: () => ({ queryKey: ["catalog"], queryFn: state.catalog }),
}));
vi.mock("@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services", () => ({
  prepareSchemaRun: async () => ({ fields: [], reports: [] }),
}));
// Two records a batch, so a few rows already take several batches.
vi.mock("@/capabilities/prediction-runtime/mlform/schema-run-batch", () => ({
  SCHEMA_RUN_BATCH_SIZE: 2,
  runSchemaBatch: state.batch,
}));

const version = schemaVersion({
  id: 23,
  formSchema: { fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }] },
  bindings: [binding(1)],
});
const sealed = (age: number): WorkspacePredictionDto => ({
  modelId: 1,
  modelInput: { age },
  output: {},
  status: "SUCCESS",
  errorMessage: null,
  errorJson: null,
  attestation: `seal-${age}`,
});
const answer: Batch = async (_target, _bindings, _fields, records) =>
  records.map((record) => [sealed(record.age)]);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const pending = () => {
  let finish!: (rows: WorkspacePredictionDto[][]) => void;
  const answered = new Promise<WorkspacePredictionDto[][]>((resolve) => (finish = resolve));
  return { answered, finish: (ages: number[]) => finish(ages.map((age) => [sealed(age)])) };
};

function BulkHarness({ snapshot = version }: { snapshot?: SchemaVersionDto }) {
  const session = useInferenceSession("bookmark-1", snapshot.id);
  return (
    <>
      <SchemaRunBulkUploadButton
        bookmarkId="bookmark-1"
        version={snapshot}
        onResults={session.addResults}
      />
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

const names = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLInputElement>('input[aria-label="Inference name"]')].map(
    (input) => input.value,
  );
const ages = (call: Parameters<Batch>) => call[3].map((record) => record.age);

describe("bulk inference session", () => {
  beforeEach(() => {
    state.batch.mockReset();
    state.batch.mockImplementation(answer);
    state.saveMany.mockReset();
    state.saveMany.mockImplementation(
      async ({
        runs,
        onSaved,
      }: {
        runs: unknown[];
        onSaved: (from: number, ids: number[]) => void;
      }) =>
        onSaved(
          0,
          runs.map((_, index) => 100 + index),
        ),
    );
    state.save.mockReset();
    state.userId = 7;
    state.catalog.mockReset();
    state.catalog.mockResolvedValue({ fields: [], reports: [] });
  });
  afterEach(() => vi.clearAllMocks());

  test("runs the rows a batch at a time and keeps them unsaved until Save all", async () => {
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55\nthird,60");

    expect(state.batch.mock.calls.map(ages)).toEqual([[42, 55], [60]]);
    expect(state.saveMany).not.toHaveBeenCalled();
    expect(names(host)).toEqual(["third", "second", "first"]);
    expect(host.textContent).toContain("3 unsaved");
    expect(host.textContent).toContain("3 uploaded, 0 failed, 0 skipped");
  });

  test("Save all saves every row in one request, oldest first, with its own seals", async () => {
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55");

    await click("Save all (2)", host);

    expect(state.saveMany).toHaveBeenCalledTimes(1);
    expect(state.saveMany.mock.calls[0]![0].runs).toEqual([
      {
        schemaVersionId: 23,
        name: "first",
        inputData: { age: 42 },
        results: [{ attestation: "seal-42" }],
      },
      {
        schemaVersionId: 23,
        name: "second",
        inputData: { age: 55 },
        results: [{ attestation: "seal-55" }],
      },
    ]);
    expect(state.save).not.toHaveBeenCalled();
    expect(host.textContent).toContain("All saved");
    expect(toasts.success).toHaveBeenCalledWith("2 inferences saved");
  });

  test("a save that fails part way keeps the runs before it and leaves the rest to retry", async () => {
    state.saveMany.mockImplementationOnce(
      async ({ onSaved }: { onSaved: (from: number, ids: number[]) => void }) => {
        onSaved(0, [100]);
        throw new Error("Prediction run name already exists: second");
      },
    );
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55");

    await click("Save all (2)", host);

    expect(host.textContent).toContain("1 unsaved");
    expect(toasts.error).toHaveBeenCalledWith("Could not save 1 inference", {
      description: "Prediction run name already exists: second",
    });
    expect(host.textContent).toContain("Save all (1)");
  });

  test("a batch the server refuses fails its rows alone, reported once", async () => {
    state.batch.mockRejectedValueOnce(new Error("Runtime unavailable"));
    const { host } = await renderBulk();
    await upload(host, "name,age\nfailed,42\nalso-failed,43\nskipped,invalid\nkept,55");

    expect(names(host)).toEqual(["kept"]);
    expect(host.textContent).toContain("1 uploaded, 2 failed, 1 skipped");
    expect(toasts.error).toHaveBeenCalledWith("2 rows could not run", {
      description: "Runtime unavailable",
    });
    expect(toasts.error).toHaveBeenCalledWith("Skipped 1 line", expect.anything());
    expect(toasts.error).toHaveBeenCalledTimes(2);
  });

  test("Stop aborts the batch in flight and keeps the rows already run", async () => {
    const second = pending();
    state.batch.mockImplementationOnce(answer).mockImplementationOnce(() => second.answered);
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55\nthird,60\nfourth,61\nfifth,62");

    await click(
      [...host.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Bulk 2/5"),
      )!,
    );
    const signal = state.batch.mock.calls[1]![4]!;
    expect(signal.aborted).toBe(true);
    await act(async () => {
      second.finish([60, 61]);
      await flush();
    });

    expect(state.batch).toHaveBeenCalledTimes(2);
    expect(names(host)).toEqual(["second", "first"]);
    expect(host.textContent).toContain("2 uploaded, 0 failed, 0 skipped, 3 not processed");
  });

  test("leaving the page aborts the batch in flight and keeps the rows already run", async () => {
    const second = pending();
    state.batch.mockImplementationOnce(answer).mockImplementationOnce(() => second.answered);
    const { host, show } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55\nthird,60");

    await show(false);
    expect(state.batch.mock.calls[1]![4]!.aborted).toBe(true);
    await act(async () => {
      second.finish([60]);
      await flush();
    });
    await show(true);

    expect(names(host)).toEqual(["second", "first"]);
    expect(state.saveMany).not.toHaveBeenCalled();
  });

  test("rejects an invalid header without running or storing rows", async () => {
    const { host } = await renderBulk();
    await upload(host, "name,unknown\nfirst,42");

    expect(state.batch).not.toHaveBeenCalled();
    expect(names(host)).toEqual([]);
  });

  test("a catalog failure leaves the session untouched and allows retry", async () => {
    state.catalog.mockRejectedValueOnce(new Error("Catalog unavailable"));
    const { host } = await renderBulk();
    await upload(host, "name,age\nfirst,42");
    expect(state.batch).not.toHaveBeenCalled();
    expect(names(host)).toEqual([]);

    await upload(host, "name,age\nfirst,42");

    expect(names(host)).toEqual(["first"]);
  });

  test.each(["snapshot", "member"])("a change of %s drops in-flight results", async (change) => {
    const first = pending();
    state.batch.mockImplementationOnce(() => first.answered);
    const { host, show } = await renderBulk();
    await upload(host, "name,age\nfirst,42\nsecond,55");
    if (change === "member") state.userId = 8;
    await show(true, change === "snapshot" ? { ...version, id: 24 } : version);
    await act(async () => {
      first.finish([42, 55]);
      await flush();
    });

    expect(state.batch).toHaveBeenCalledTimes(1);
    expect(names(host)).toEqual([]);
  });

  test("generates distinct names for repeated unnamed uploads", async () => {
    const { host } = await renderBulk();
    await upload(host, "age\n42");
    await upload(host, "age\n55");

    expect(names(host)).toHaveLength(2);
    expect(new Set(names(host)).size).toBe(2);
  });

  test("draws only the rows in view of a large session", async () => {
    const rows = Array.from({ length: 400 }, (_, index) => `row-${index},${index}`).join("\n");
    state.batch.mockImplementation(answer);
    const { host } = await renderBulk();
    await upload(host, `name,age\n${rows}`);

    expect(host.textContent).toContain("400 unsaved");
    expect(names(host).length).toBeGreaterThan(0);
    expect(names(host).length).toBeLessThan(50);
  });
});
