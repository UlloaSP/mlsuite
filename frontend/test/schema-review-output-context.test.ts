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

  // A bookmark with two models, stored as a workspace run stores them: the runtime's answer,
  // then the form's report under the id MLForm gave it.
  const penguins = {
    bindings: [
      binding(1, { modelName: "Penguin Species" }),
      binding(2, { modelName: "Penguin Body Mass" }),
    ],
    formSchema: {
      fields: [],
      reports: [
        {
          kind: "classifier",
          label: "Species",
          labels: ["Adelie", "Chinstrap", "Gentoo"],
          mappedTo: { "Penguin Species": 0 },
          feedbackQuestionnaire: {
            steps: [
              {
                id: "species-check",
                title: "Species check",
                fields: [{ id: "agree", kind: "boolean", label: "Agree?" }],
              },
            ],
          },
        },
        { kind: "regressor", label: "Body mass", mappedTo: { "Penguin Body Mass": 0 } },
      ],
    },
  };
  const species = {
    kind: "classifier",
    output: 0,
    mapping: ["Adelie", "Chinstrap", "Gentoo"],
    prediction: "Gentoo",
    probabilities: [0, 0, 1],
  };
  const penguinResults = (bodyMass: Record<string, unknown>) => [
    {
      id: 1,
      modelId: 1,
      status: "SUCCESS" as const,
      output: { reports: [species, { ...species, id: "species", mappedTo: "0" }] },
    },
    {
      id: 2,
      modelId: 2,
      status: "SUCCESS" as const,
      output: {
        reports: [
          { kind: "regressor", output: 0, ...bodyMass },
          { kind: "regressor", output: 0, ...bodyMass, id: "body-mass", mappedTo: "0" },
        ],
      },
    },
  ];

  test("tells every step of a built-in report by its prediction, a regressor's value included", () => {
    const steps = buildSchemaFeedbackSteps(penguins, penguinResults({ values: [3531.39] }), []);

    expect(steps.map((step) => [step.title, step.description])).toEqual([
      ["Species", "Prediction result: Gentoo · 100.00%"],
      // The questionnaire of a built-in report shows its prediction, not the payload it was stored as.
      ["Species review", "Prediction result: Gentoo · 100.00%"],
      ["Body mass", `Prediction result: ${(3531.39).toLocaleString()}`],
    ]);
  });

  test("never stringifies a built-in report's stored payload or a structured prediction", () => {
    const withoutValue = buildSchemaFeedbackSteps(penguins, penguinResults({ values: [] }), []);
    expect(withoutValue.find((step) => step.title === "Body mass")?.description).toBe("");

    const structured = buildSchemaFeedbackSteps(
      penguins,
      penguinResults({ value: { grams: 3531 } }),
      [],
    );
    const description = structured.find((step) => step.title === "Body mass")?.description;
    expect(description).toBe('Prediction result: {"grams":3531}');
    expect(structured.map((step) => step.description).join("\n")).not.toContain("[object Object]");
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
