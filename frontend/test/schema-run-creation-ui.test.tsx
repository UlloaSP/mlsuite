/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { Provider, createStore } from "jotai";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { themeWithHtmlAtom } from "@/shared/ui/ui-state";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { SchemaRunSaveModal } from "@/features/schemas/components/SchemaRunSaveModal";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

const mountState = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
  updateTheme: vi.fn(),
}));
const catalogState = vi.hoisted(() => ({
  data: { fieldDefinitions: [], reportDefinitions: [] },
  error: "",
  needsPlugins: false,
  retry: vi.fn(),
  status: "ready",
}));

vi.mock("@/capabilities/prediction-runtime/mlform/schema-run-mount", () => ({
  mountSchemaRunForm: mountState.mount,
}));

vi.mock("@/features/schemas/lib/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => catalogState,
}));

vi.mock("@/capabilities/prediction-runtime/feedback/feedback-steps", () => ({
  buildSchemaFeedbackSteps: () => [{ id: "feedback-step" }],
}));

vi.mock("@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire", () => ({
  buildCombinedFeedbackQuestionnaire: () => ({
    schema: { steps: [] },
    initialValues: {},
  }),
}));

vi.mock("@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount", () => ({
  ReportQuestionnaireMount: () => <div data-questionnaire="">Feedback questionnaire</div>,
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Snapshot 1",
  formSchema: {
    fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
    reports: [{ id: "score", label: "Score", kind: "regressor", mappedTo: "score" }],
  },
  bindings: [{ modelId: "model-1" }],
  createdAt: "",
};

describe("schema run creation UI", () => {
  let root: Root | null = null;

  beforeEach(() => {
    mountState.mount.mockReset();
    mountState.unmount.mockReset();
    mountState.updateTheme.mockReset();
    mountState.mount.mockImplementation(() => ({
      form: {
        reports: [],
        state: { reportStates: {} },
        subscribe: () => () => {},
      },
      host: document.createElement("div"),
      unmount: mountState.unmount,
      updateTheme: mountState.updateTheme,
    }));
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  test("updates mounted form theme without remounting resolved reports", async () => {
    const store = createStore();
    store.set(themeWithHtmlAtom, "light");
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <Provider store={store}>
          <SchemaRunForm version={version} onSubmit={vi.fn()} />
        </Provider>,
      );
      await flush();
    });
    expect(mountState.mount).toHaveBeenCalledTimes(1);
    mountState.updateTheme.mockClear();

    await act(async () => {
      store.set(themeWithHtmlAtom, "dark");
      await flush();
    });

    expect(mountState.mount).toHaveBeenCalledTimes(1);
    expect(mountState.unmount).not.toHaveBeenCalled();
    expect(mountState.updateTheme).toHaveBeenCalledWith("dark");
  });

  test("orders one-column summary and collapses outputs and inputs", async () => {
    const store = createStore();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <Provider store={store}>
          <SchemaRunSaveModal
            open
            pendingRun={{
              inputData: { age: 42 },
              raw: {
                results: [
                  {
                    modelId: "model-1",
                    modelInput: { age: 42 },
                    output: { reports: [{ mappedTo: "score", value: 0.8 }] },
                    status: "SUCCESS",
                  },
                ],
              },
              reportsPending: false,
            }}
            version={version}
            defaultName="Inference 1"
            isSaving={false}
            onCancel={vi.fn()}
            onSave={vi.fn()}
          />
        </Provider>,
      );
      await flush();
    });

    const sections = Array.from(
      document.body.querySelectorAll<HTMLElement>("[data-inference-create-section]"),
      (section) => section.dataset.inferenceCreateSection,
    );
    expect(sections).toEqual(["name", "feedback", "outputs", "inputs"]);
    const outputs = document.body.querySelector<HTMLElement>(
      '[data-inference-create-section="outputs"]',
    )!;
    const inputs = document.body.querySelector<HTMLElement>(
      '[data-inference-create-section="inputs"]',
    )!;
    expect(outputs.textContent).toContain("0.8");
    expect(inputs.textContent).toContain("42");

    await act(async () => {
      outputs.querySelector("button")?.click();
      inputs.querySelector("button")?.click();
      await flush();
    });

    expect(outputs.textContent).not.toContain("0.8");
    expect(inputs.textContent).not.toContain("42");
  });
});
