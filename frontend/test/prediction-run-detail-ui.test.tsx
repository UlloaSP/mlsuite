/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { PredictionRunDetails } from "@/features/schemas/components/PredictionRunDetails";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { changeValue, mount } from "./support/dom";

const queryState = vi.hoisted(() => ({ refetch: vi.fn(), runError: false }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 1,
  useWorkspaceContext: () => ({
    data: { permissions: { canRunPredictions: true, canViewOrganization: true } },
  }),
}));

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 3,
  name: "Risk model",
  createdAt: "2026-08-24T12:00:00Z",
  bindings: [
    { modelId: "model-1", modelName: "Risk Forest" },
    { modelId: "model-2", modelName: "Risk Boost" },
  ],
  formSchema: {
    fields: [
      { id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" },
      { id: "sex", label: "Sex", kind: "text", displayKey: "sex", mappedTo: "sex" },
    ],
    reports: [
      {
        id: "score",
        label: "Risk score",
        kind: "regressor",
        mappedTo: { "model-1": "score", "model-2": "score-2" },
      },
    ],
  },
};

const run: PredictionRunDto = {
  id: "run-1",
  schemaVersionId: version.id,
  schemaBookmarkId: "bookmark-1",
  name: "manito",
  status: "SUCCESS",
  createdAt: "2026-08-24T15:15:00Z",
  inputData: { age: 52, sex: "Female" },
  results: [
    {
      id: "result-1",
      runId: "run-1",
      modelId: "model-1",
      status: "SUCCESS",
      createdAt: "2026-08-24T15:15:00Z",
      modelInput: { age: 52, sex: "Female" },
      output: { reports: [{ mappedTo: "score", value: "High" }] },
    },
    {
      id: "result-2",
      runId: "run-1",
      modelId: "model-2",
      status: "SUCCESS",
      createdAt: "2026-08-24T15:15:00Z",
      modelInput: { age: 52 },
      output: { reports: [{ mappedTo: "score-2", value: "Low" }] },
    },
  ],
};

vi.mock("@/features/schemas/api/schema-queries", () => ({
  usePredictionRun: () =>
    queryState.runError
      ? { data: undefined, isLoading: false, isError: true }
      : { data: run, isLoading: false, isError: false },
  useSchemaBookmark: () => ({
    data: { id: "bookmark-1", schemaId: "schema-1", name: "Ward bookmark" },
  }),
  useSchemaVersion: () => ({ data: version }),
  usePredictionRunFeedback: () => ({ data: [], refetch: queryState.refetch }),
}));

vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => ({ data: { reportDefinitions: [] } }),
}));

vi.mock("@/capabilities/prediction-runtime/feedback/feedback-steps", () => ({
  buildSchemaFeedbackSteps: () => [
    {
      schema: {
        steps: [
          {
            id: "output-feedback",
            title: "Output feedback",
            fields: [{ id: "assessment", kind: "number", label: "Assessment" }],
          },
        ],
      },
      targets: [{ feedback: undefined }],
    },
  ],
}));

vi.mock("@/capabilities/prediction-runtime/reports/SchemaRunReportRenderer", () => ({
  SchemaRunReportRenderer: ({
    result,
    report,
  }: {
    result: { modelId: string };
    report: object;
  }) => <div data-output="">{`${result.modelId} ${JSON.stringify(report)}`}</div>,
}));

describe("prediction run details", () => {
  beforeEach(() => {
    queryState.refetch.mockReset();
    queryState.runError = false;
  });

  const renderPage = async (withReviews = true) => {
    const { host } = await mount(
      <PredictionRunDetails
        runId="run-1"
        bookmarkName="Ward bookmark"
        reviews={
          withReviews ? { content: <section>Review management</section>, count: "1/2" } : undefined
        }
      />,
      { route: "/" },
    );
    return host;
  };

  test("shows compact metadata, task tabs, and searchable inputs without overview", async () => {
    const container = await renderPage();

    expect(container.textContent).toContain("Success");
    expect(container.textContent).toContain("Feedback pending");
    expect(container.textContent).toContain("Ward bookmark");
    expect(container.textContent).toContain("2 models");
    const initialTabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(initialTabs.map((item) => item.textContent)).toEqual([
      "Inputs2",
      "Outputs2",
      "Reviews1/2",
    ]);
    expect(container.textContent).not.toContain("Overview");

    const inputsPanel = container.querySelector<HTMLElement>('[role="tabpanel"]')!;
    const inputSearch = container.querySelector<HTMLInputElement>('[aria-label="Search inputs"]')!;
    await changeValue(inputSearch, "sex");
    expect(inputsPanel.textContent).toContain("Sex");
    expect(inputsPanel.textContent).not.toContain("Age");
    await changeValue(inputSearch, "missing");
    expect(inputsPanel.textContent).toContain('No inputs match "missing"');

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    act(() => {
      tabs
        .find((tab) => tab.textContent?.startsWith("Outputs"))
        ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(container.textContent).toContain("Risk score");
    expect(container.querySelector('[aria-label="Search outputs"]')).toBeNull();
    expect(container.querySelectorAll("[data-output]")).toHaveLength(2);

    expect(container.textContent).not.toContain("Review management");
    act(() => {
      tabs
        .find((tab) => tab.textContent?.startsWith("Reviews"))
        ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(container.textContent).toContain("Review management");
  });

  test("offers no Reviews tab to members who cannot manage reviews", async () => {
    const container = await renderPage(false);
    const tabs = [...container.querySelectorAll('[role="tab"]')].map((item) => item.textContent);
    expect(tabs).toEqual(["Inputs2", "Outputs2"]);
  });

  test("explains a run that cannot be loaded", async () => {
    queryState.runError = true;
    const page = await renderPage();
    expect(page.textContent).toContain("Inference data unavailable");
    expect(page.querySelector('[role="tab"]')).toBeNull();
  });
});
