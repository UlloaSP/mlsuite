// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { ReviewWithoutQuestionnaire } from "@/features/reviews/components/ReviewWithoutQuestionnaire";
import { ReviewOutputsSection } from "@/features/reviews/components/ReviewOutputsSection";
import { mount } from "./support/dom";
import { binding, predictionResult, schemaVersion } from "./support/api-fixtures";

const state = vi.hoisted(() => ({
  submit: vi.fn(),
  status: "ready",
  error: "",
  retry: vi.fn(),
  definitions: [{ kind: "QA Report" }],
}));
vi.mock("@/features/reviews/api/review-api", () => ({ submitSchemaReviewRuns: state.submit }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => "org-1",
}));
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => ({
    status: state.status,
    error: state.error,
    retry: state.retry,
    data: { reportDefinitions: state.definitions },
  }),
}));
vi.mock("@/capabilities/prediction-runtime/reports/SchemaRunReportRenderer", () => ({
  SchemaRunReportRenderer: ({
    report,
    result,
    customReportDefinitions,
  }: {
    report: { kind: string };
    result: { modelId: string };
    customReportDefinitions: Array<{ kind: string }>;
  }) => (
    <div data-rendered={result.modelId}>
      {report.kind} renderer {customReportDefinitions.map((item) => item.kind).join(",")}
    </div>
  ),
}));
afterEach(() => {
  vi.clearAllMocks();
  state.status = "ready";
});
test("completes selected zero-questionnaire run explicitly and retries failures", async () => {
  const onCompleted = vi.fn();
  state.submit.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(undefined);
  const { host: container } = await mount(
    <ReviewWithoutQuestionnaire
      reviewId="review-1"
      reviewRunId="item-2"
      onCompleted={onCompleted}
    />,
  );
  await act(async () => container.querySelector("button")?.click());
  expect(onCompleted).not.toHaveBeenCalled();
  expect(container.querySelector("button")?.disabled).toBe(false);
  await act(async () => container.querySelector("button")?.click());
  expect(state.submit).toHaveBeenLastCalledWith("review-1", ["item-2"]);
  expect(onCompleted).toHaveBeenCalledOnce();
});
const version = schemaVersion({
  name: "Test",
  bindings: [binding(1)],
  formSchema: {
    fields: [],
    reports: [
      { id: "custom", kind: "QA Report", label: "Custom", mappedTo: { "model-1": "custom" } },
    ],
  },
});
const result = predictionResult({
  modelInput: { age: 42 },
  output: { reports: [{ mappedTo: "custom", payload: { message: "Proof" } }] },
});
test("review outputs pass matched reports and catalog to shared renderer", async () => {
  const { host: container } = await mount(
    <ReviewOutputsSection version={version} results={[result]} />,
  );
  expect(container.querySelector('[data-rendered="1"]')?.textContent).toContain(
    "QA Report renderer QA Report",
  );
  expect(container.querySelector("pre")).toBeNull();
});
test("reports loading, errors with retry, and no outputs without raw JSON fallback", async () => {
  state.status = "loading";
  const view = await mount(<ReviewOutputsSection version={version} results={[]} />);
  const container = view.host;
  expect(container.textContent).toContain("Loading report renderers");
  state.status = "error";
  state.error = "Catalog inaccessible";
  await view.rerender(<ReviewOutputsSection version={version} results={[]} />);
  expect(container.textContent).toContain("Catalog inaccessible");
  await act(async () => container.querySelector("button")?.click());
  expect(state.retry).toHaveBeenCalledOnce();
  state.status = "ready";
  await view.rerender(<ReviewOutputsSection version={version} results={[]} />);
  expect(container.textContent).toContain("No outputs returned");
});
