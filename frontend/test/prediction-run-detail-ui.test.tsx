/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { PredictionRunDetailPage } from "@/features/schemas/pages/prediction-run-detail-page";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

const queryState = vi.hoisted(() => ({ refetch: vi.fn() }));

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
  useSchema: () => ({ data: { name: "Transplant schema" } }),
  usePredictionRun: () => ({ data: run, isLoading: false }),
  useSchemaBookmark: () => ({ data: { name: "Ward bookmark" } }),
  useSchemaVersion: () => ({ data: version }),
  usePredictionRunFeedback: () => ({ data: [], refetch: queryState.refetch }),
}));

vi.mock("@/features/schemas/lib/schema-plugin-catalog", () => ({
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

vi.mock("@/features/schemas/components/SchemaRunFeedbackQuestionnaire", () => ({
  SchemaRunFeedbackQuestionnaire: () => <div>Feedback questionnaire</div>,
}));

vi.mock("@/features/schemas/components/SchemaRunReportRenderer", () => ({
  SchemaRunReportRenderer: ({
    result,
    report,
  }: {
    result: { modelId: string };
    report: object;
  }) => <div data-output="">{`${result.modelId} ${JSON.stringify(report)}`}</div>,
}));

const setInput = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

describe("prediction run detail", () => {
  let root: Root | null = null;

  beforeEach(() => queryState.refetch.mockReset());

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  test("shows compact metadata, task tabs, and searchable inputs without overview", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={["/schemas/schema-1/bookmarks/bookmark-1/runs/run-1"]}>
          <Routes>
            <Route
              path="/schemas/:schemaId/bookmarks/:bookmarkId/runs/:runId"
              element={<PredictionRunDetailPage />}
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain("SUCCESS");
    expect(container.textContent).toContain("Feedback pending");
    expect(container.textContent).toContain("Ward bookmark");
    expect(container.textContent).toContain("2 models");
    const initialTabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(initialTabs.map((item) => item.textContent)).toEqual([
      "Inputs2",
      "Outputs2",
      "Feedback0/1",
    ]);
    expect(container.textContent).not.toContain("Overview");

    const inputsPanel = container.querySelector<HTMLElement>('[role="tabpanel"]')!;
    const inputSearch = container.querySelector<HTMLInputElement>('[aria-label="Search inputs"]')!;
    setInput(inputSearch, "sex");
    expect(inputsPanel.textContent).toContain("Sex");
    expect(inputsPanel.textContent).not.toContain("Age");
    setInput(inputSearch, "missing");
    expect(inputsPanel.textContent).toContain('No inputs match "missing".');

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    act(() => tabs.find((tab) => tab.textContent?.startsWith("Outputs"))?.click());
    expect(container.textContent).toContain("Risk score");
    expect(container.querySelector('[aria-label="Search outputs"]')).toBeNull();
    expect(container.querySelectorAll("[data-output]")).toHaveLength(2);

    act(() => tabs.find((tab) => tab.textContent?.startsWith("Feedback"))?.click());
    expect(container.textContent).toContain("Feedback questionnaire");
  });
});
