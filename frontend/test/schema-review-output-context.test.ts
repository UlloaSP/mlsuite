/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { getVisibleSchemaInputRecord } from "@/capabilities/prediction-runtime/data/input-display";
import { binding } from "./support/api-fixtures";

describe("schema review output context", () => {
  test("describes classifier feedback with prediction and probability", () => {
    const steps = buildSchemaFeedbackSteps(
      {
        bindings: [binding(1)],
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
          id: 1,
          modelId: 1,
          status: "SUCCESS",
          output: {
            reports: [{ mappedTo: "predicted_class", prediction: 1, probabilities: [0.2, 0.8] }],
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
          displayKey: "bloodGroup",
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
        { id: "age", label: "age", displayKey: "age", kind: "number" },
      ],
    };

    expect(
      getVisibleSchemaInputRecord(schema, {
        bloodGroup: "B",
        age: 52,
      }),
    ).toEqual({ "Blood Group": "B", age: 52 });
  });
});
