// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { SchemaRunHistoryPage } from "@/features/schemas/pages/schema-run-history-page";

const requests = vi.hoisted(() => ({
  runs: undefined as Promise<unknown> | undefined,
  version: undefined as Promise<unknown> | undefined,
  feedback: undefined as Promise<unknown> | undefined,
}));
vi.mock("@/features/schemas/api/schema-queries", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    useSchema: () => ({ data: { name: "Schema" } }),
    useSchemaBookmark: () =>
      useQuery({
        queryKey: ["bookmark"],
        queryFn: async () => ({ id: "5", versionId: "3", name: "Stable" }),
      }),
    useSchemaVersion: () => useQuery({ queryKey: ["version"], queryFn: () => requests.version! }),
    usePredictionRunsForBookmark: () =>
      useQuery({ queryKey: ["runs"], queryFn: () => requests.runs!, placeholderData: [] }),
    usePredictionRunsFeedback: (runs: unknown[]) => {
      const query = useQuery({
        queryKey: ["feedback", runs.length],
        queryFn: () => requests.feedback!,
        placeholderData: [],
        enabled: runs.length > 0,
      });
      return { ...query, data: query.data ?? [] };
    },
  };
});
vi.mock("@/features/schemas/components/SchemaRunHistoryToolbar", () => ({
  SchemaRunHistoryToolbar: () => null,
}));
vi.mock("@/features/schemas/components/SchemaRunReviewButton", () => ({
  SchemaRunReviewButton: () => null,
}));
vi.mock("@/features/schemas/components/SchemaRunBulkUploadButton", () => ({
  SchemaRunBulkUploadButton: () => null,
}));

function Location() {
  return <output>{useLocation().search}</output>;
}
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const runs = Array.from({ length: 21 }, (_, i) => ({
  id: String(i + 1),
  name: `Run ${i + 1}`,
  schemaVersionId: "3",
  status: "SUCCESS",
  results: [],
  inputData: {},
  createdAt: "2026-09-09T10:00:00Z",
}));
const version = {
  id: "3",
  schemaId: "2",
  name: "Version",
  version: 1,
  bindings: [],
  formSchema: { fields: [], reports: [] },
};
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
async function settle(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function mount(search: string) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await settle(() =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/history${search}`]}>
          <Location />
          <SchemaRunHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
}
afterEach(async () => {
  await act(async () => root?.unmount());
  client?.clear();
  host?.remove();
});

test("cold history page preserves URL while real query exposes empty placeholder data", async () => {
  const pendingRuns = deferred();
  requests.runs = pendingRuns.promise;
  requests.version = Promise.resolve(version);
  requests.feedback = Promise.resolve([]);
  await mount("?page=2");
  expect(client.getQueryData(["runs"])).toBeUndefined();
  expect(host.querySelector("output")?.textContent).toBe("?page=2");
  expect(host.textContent).toContain("Loading inference history");
  await settle(() => pendingRuns.resolve(runs));
  expect(host.querySelector("output")?.textContent).toBe("?page=2");
  expect(host.querySelector("article h2")?.textContent).toBe("Run 11");
});

test("feedback-filtered URL waits for version and feedback responses before clamping", async () => {
  const pendingVersion = deferred();
  const pendingFeedback = deferred();
  requests.runs = Promise.resolve(runs);
  requests.version = pendingVersion.promise;
  requests.feedback = pendingFeedback.promise;
  await mount("?feedback=NOT_REQUIRED&page=2");
  expect(host.querySelector("output")?.textContent).toBe("?feedback=NOT_REQUIRED&page=2");
  expect(host.querySelector("article")).toBeNull();
  await settle(() => pendingVersion.resolve(version));
  expect(host.querySelector("output")?.textContent).toBe("?feedback=NOT_REQUIRED&page=2");
  expect(host.querySelector("article")).toBeNull();
  await settle(() => pendingFeedback.resolve([]));
  expect(host.querySelector("output")?.textContent).toBe("?feedback=NOT_REQUIRED&page=2");
  expect(host.querySelector("article h2")?.textContent).toBe("Run 11");
});

test("feedback fetch failure retains page and shows recoverable error", async () => {
  const pendingFeedback = deferred();
  requests.runs = Promise.resolve(runs);
  requests.version = Promise.resolve(version);
  requests.feedback = pendingFeedback.promise;
  await mount("?feedback=COMPLETED&page=2");
  await settle(() => {});
  expect(client.getQueryState(["feedback", runs.length])?.fetchStatus).toBe("fetching");
  await settle(() => pendingFeedback.reject(new Error("Unavailable")));
  expect(host.querySelector("output")?.textContent).toBe("?feedback=COMPLETED&page=2");
  expect(host.textContent).toContain("Could not load inference history.");
  expect(host.textContent).toContain("Retry");
  expect(host.textContent).not.toContain("Loading inference history");
});
