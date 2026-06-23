/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { createRoot, type Root } from "react-dom/client";
import { SchemaFormPreview } from "../src/schemas/components/SchemaFormPreview";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

vi.mock("../src/algorithms/models/prediction-catalog-definitions", () => ({
  loadPredictionCatalogDefinitions: vi.fn(async () => {
    throw new Error("catalog failed");
  }),
}));

describe("schema form preview", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = "";
  });

  test("renders a schema form and local built-in report preview", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    root.render(
      <SchemaFormPreview
        schema={{
          fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
          reports: [{ id: "prediction", kind: "classifier", mappedTo: "prediction" }],
        }}
      />,
    );

    await flush();
    await flush();
    const formRoot = container.querySelector("mlf-form")?.shadowRoot;
    expect(formRoot?.querySelectorAll("mlf-field-frame")).toHaveLength(1);

    formRoot
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    expect(formRoot?.querySelectorAll("mlf-report-frame")).toHaveLength(1);
  });

  test("renders one local report preview per mappedTo entry", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    root.render(
      <SchemaFormPreview
        schema={{
          fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
          reports: [
            {
              id: "prediction",
              label: "Prediction",
              kind: "classifier",
              mappedTo: { "Model A": "prediction_a", "Model B": "prediction_b" },
            },
          ],
        }}
      />,
    );

    await flush();
    await flush();
    const formRoot = container.querySelector("mlf-form")?.shadowRoot;
    formRoot
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    expect(formRoot?.querySelectorAll("mlf-report-frame")).toHaveLength(2);
  });

  test("shows an error when required plugin definitions are unavailable", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    root.render(
      <SchemaFormPreview
        schema={{
          fields: [{ id: "custom", label: "Custom", kind: "External Slider" }],
          reports: [],
        }}
      />,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) await flush();

    expect(container.textContent).toContain("Retry");
  });
});
