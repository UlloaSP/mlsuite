/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaFeedbackSteps } from "../src/schemas/schema-feedback-steps";
import { getVisibleSchemaInputRecord } from "../src/schemas/schema-run-display";

describe("schema review output context", () => {
  test("describes classifier feedback with prediction and probability", () => {
    const steps = buildSchemaFeedbackSteps(
      {
        id: "version-1",
        schemaId: "schema-1",
        version: 1,
        name: "Risk",
        createdAt: "2026-06-04T00:00:00Z",
        bindings: [{ modelId: "model-1" }],
        formSchema: {
          fields: [],
          reports: [
            {
              id: "report_1",
              label: "Predicted class",
              kind: "classifier",
              mappedTo: { "model-1": "predicted_class" },
              labels: ["Low", "High"],
            },
          ],
        },
      },
      [
        {
          id: "result-1",
          runId: "run-1",
          modelId: "model-1",
          status: "SUCCESS",
          createdAt: "2026-06-04T00:00:00Z",
          modelInput: {},
          output: {
            reports: { predicted_class: { prediction: 1, probabilities: [0.2, 0.8] } },
          },
        },
      ],
      [],
    );

    expect(steps[0]?.description).toBe("Prediction result: High · 80.00%");
  });

  test("builds review input record from visible schema fields", () => {
    const schema = {
      fields: [
        {
          id: "blood_group",
          label: "Blood Group",
          kind: "onehot-category",
          options: [
            {
              label: "A",
              value: "A",
              mappedTo: "blood_group__A",
            },
            {
              label: "B",
              value: "B",
              mappedTo: "blood_group__B",
            },
          ],
        },
        { id: "age", label: "age", kind: "number" },
      ],
    };

    expect(
      getVisibleSchemaInputRecord(schema, {
        blood_group__A: 0,
        blood_group__B: 1,
        age: 52,
      }),
    ).toEqual({ "Blood Group": "B", age: 52 });
  });
});
