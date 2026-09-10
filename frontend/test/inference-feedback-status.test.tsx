// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { InferenceFeedbackStatuses } from "@/features/schemas/components/InferenceFeedbackStatuses";
import { FeedbackStatusBadge } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import { PREDICTION_FEEDBACK_QUERY_KEY } from "@/features/schemas/api/schema-keys";

const api = vi.hoisted(() => ({ run: vi.fn(), version: vi.fn(), feedback: vi.fn() }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
}));
vi.mock("@/features/schemas/api/schema-api", async (original) => ({
  ...(await original<object>()),
  getSchemaVersion: api.version,
}));
vi.mock("@/features/schemas/api/schema-prediction-api", async (original) => ({
  ...(await original<object>()),
  getPredictionRun: api.run,
  getPredictionRunsFeedback: api.feedback,
}));
let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
const items = [
  { id: "1", schemaVersionId: "v1" },
  { id: "2", schemaVersionId: "v1" },
];
const version = {
  id: "v1",
  name: "Version",
  schemaId: "s1",
  version: 1,
  bindings: [{ modelId: "m1" }],
  formSchema: {
    fields: [],
    reports: [
      { kind: "classifier", label: "Score", mappedTo: { m1: "score" }, labels: ["No", "Yes"] },
    ],
  },
};
const run = (id: string) => ({
  id,
  schemaVersionId: "v1",
  results: [
    {
      id: `r${id}`,
      modelId: "m1",
      status: "SUCCESS",
      output: { reports: [{ mappedTo: "score", prediction: 1 }] },
    },
  ],
});
const saved = (id: string) => ({
  id: `f${id}`,
  resultId: `r${id}`,
  type: "OUTPUT",
  order: 0,
  value: { "output-feedback-assessment": "Yes" },
});

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  api.run.mockReset().mockImplementation(async (id) => run(id));
  api.version.mockReset().mockResolvedValue(version);
  api.feedback.mockReset().mockResolvedValue([]);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
});
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <InferenceFeedbackStatuses items={items}>
          {(statuses) =>
            items.map((item) => (
              <div key={item.id} data-run={item.id}>
                <FeedbackStatusBadge status={statuses.get(item.id)} />
              </div>
            ))
          }
        </InferenceFeedbackStatuses>
      </QueryClientProvider>,
    ),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

test("loads only supplied runs, deduplicates versions, batches feedback and shares mutation invalidation", async () => {
  api.feedback.mockResolvedValue([saved("1")]);
  await render();
  expect(host.querySelector('[data-run="1"]')?.textContent).toContain("COMPLETED");
  expect(host.querySelector('[data-run="2"]')?.textContent).toContain("PENDING");
  expect(api.run.mock.calls.map(([id]) => id)).toEqual(["1", "2"]);
  expect(api.version).toHaveBeenCalledTimes(1);
  expect(api.feedback.mock.calls[0]?.[0]).toEqual(["1", "2"]);
  api.feedback.mockResolvedValue([saved("1"), saved("2")]);
  await act(async () => {
    await client.invalidateQueries({ queryKey: PREDICTION_FEEDBACK_QUERY_KEY(3) });
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(host.querySelector('[data-run="2"]')?.textContent).toContain("COMPLETED");
});
test("shows loading while data is unresolved, never a fabricated status", async () => {
  api.feedback.mockImplementation(() => new Promise(() => {}));
  await render();
  expect(host.textContent).toContain("Loading");
  expect(host.textContent).not.toMatch(/PENDING|Not configured/);
});
for (const resource of ["run", "version", "feedback"] as const) {
  test(`shows unavailable when ${resource} fails`, async () => {
    api[resource].mockRejectedValue(new Error("Failed"));
    await render();
    expect(host.textContent).toContain("Unavailable");
    expect(host.textContent).not.toMatch(/PENDING|Not configured/);
  });
}
test("shows not configured for a schema without questionnaires", async () => {
  api.version.mockResolvedValue({ ...version, formSchema: { fields: [], reports: [] } });
  await render();
  expect(host.textContent).toContain("Not configured");
});
test("shows unavailable for malformed persisted schema instead of claiming no feedback needed", async () => {
  api.version.mockResolvedValue({
    ...version,
    formSchema: { fields: [], reports: [{ kind: "classifier" }] },
  });
  await render();
  expect(host.textContent).toContain("Unavailable");
});
test("shows unavailable for invalid questionnaire config", async () => {
  api.version.mockResolvedValue({
    ...version,
    formSchema: {
      ...version.formSchema,
      reports: [
        { ...version.formSchema.reports[0], feedbackQuestionnaire: { steps: [{ fields: [] }] } },
      ],
    },
  });
  await render();
  expect(host.textContent).toContain("Unavailable");
});
