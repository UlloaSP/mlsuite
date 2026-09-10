// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { PredictionRunDetailPage } from "@/features/schemas/pages/prediction-run-detail-page";

const state = vi.hoisted(() => ({ canRun: false, canEdit: false, saved: false }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({
    data: { permissions: { canRunPredictions: state.canRun, canViewOrganization: state.canEdit } },
  }),
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchema: () => ({ data: { name: "QA" } }),
  useSchemaBookmark: () => ({ data: { name: "QA bookmark" } }),
  useSchemaVersion: () => ({
    data: {
      id: "1",
      schemaId: "1",
      version: 1,
      formSchema: { fields: [], reports: [] },
      bindings: [],
    },
  }),
  usePredictionRun: () => ({
    data: {
      id: "1",
      name: "QA run",
      results: [],
      inputData: {},
      status: "SUCCESS",
      createdAt: "2026-09-09T10:00:00Z",
    },
  }),
  usePredictionRunFeedback: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock("@/features/schemas/lib/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => ({ data: { reportDefinitions: [] } }),
}));
vi.mock("@/features/schemas/api/schema-prediction-mutations", () => ({
  useCreatePredictionResultFeedbackMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdatePredictionResultFeedbackMutation: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/capabilities/prediction-runtime/feedback/feedback-steps", () => ({
  buildSchemaFeedbackSteps: () => [
    {
      id: "output",
      title: "Output assessment",
      type: "OUTPUT",
      order: 0,
      initialValues: state.saved ? { assessment: 1 } : {},
      targets: [
        {
          resultId: "1",
          modelId: "1",
          feedback: state.saved ? { id: "1", value: { assessment: 1 } } : undefined,
        },
      ],
      schema: {
        steps: [
          {
            id: "assessment-step",
            title: "Assessment",
            fields: [{ id: "assessment", kind: "number", label: "Assessment", required: true }],
          },
        ],
      },
    },
  ],
}));
vi.mock("@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount", () => ({
  ReportQuestionnaireMount: () => <button>Save feedback</button>,
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test.each([
  { canRun: false, canEdit: false, saved: false },
  { canRun: false, canEdit: false, saved: true },
  { canRun: true, canEdit: true, saved: false },
  { canRun: false, canEdit: true, saved: false },
  { canRun: true, canEdit: false, saved: false },
])("run=$canRun feedback-write=$canEdit saved=$saved", async (permissions) => {
  Object.assign(state, permissions);
  await act(async () =>
    root.render(
      <MemoryRouter>
        <PredictionRunDetailPage />
      </MemoryRouter>,
    ),
  );
  expect(container.textContent?.includes("Predict again")).toBe(state.canRun);
  await act(async () =>
    [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((button) => button.textContent?.startsWith("Feedback"))!
      .click(),
  );
  expect(container.textContent?.includes("Save feedback")).toBe(state.canEdit);
  if (!state.canEdit) {
    expect(container.querySelectorAll("input,textarea,select")).toHaveLength(0);
    expect(
      [...container.querySelectorAll("button")].some((button) => button.textContent === "Edit"),
    ).toBe(false);
    expect(container.textContent).toContain(state.saved ? "Assessment1" : "No feedback saved yet.");
  }
});
