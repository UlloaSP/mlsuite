/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaRunExport } from "../src/schemas/schema-run-export";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "../src/schemas/types";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [
    {
      id: "binding-1",
      schemaVersionId: "version-1",
      modelId: "model-1",
      signatureId: "signature-1",
      inputMapping: {},
      outputMapping: { report_1: "predicted_class", crystal_1: "crystal" },
    },
  ],
  formSchema: {
    fields: [{ id: "age", label: "age", kind: "number" }],
    reports: [
      {
        id: "report_1",
        label: "Predicted class",
        kind: "classifier",
        source: "predicted_class",
        labels: ["Low", "High"],
      },
      {
        id: "crystal_1",
        label: "Crystal Tree",
        kind: "Crystal Tree",
        source: "crystal",
        feedbackQuestionnaire: {
          steps: [
            {
              id: "report-feedback",
              title: "Report feedback",
              fields: [{ kind: "rating", id: "clarity", label: "Clarity", max: 5 }],
            },
          ],
        },
      },
    ],
  },
};

const run: PredictionRunDto = {
  id: "run-1",
  schemaVersionId: "version-1",
  name: "case-1",
  status: "SUCCESS",
  createdAt: "2026-06-02T10:00:00Z",
  inputData: { age: 52 },
  results: [
    {
      id: "result-1",
      runId: "run-1",
      modelId: "model-1",
      signatureId: "signature-1",
      status: "SUCCESS",
      createdAt: "2026-06-02T10:00:00Z",
      modelInput: { age: 52 },
      output: {
        outputs: [{ type: "classifier", prediction: 1, probabilities: [0.2, 0.8] }],
        reports: { crystal: { explanation: "tree path" } },
      },
    },
  ],
};

describe("schema run export parity", () => {
  test("exports report feedback with signature-style columns", () => {
    const feedback: PredictionResultFeedbackDto[] = [
      {
        id: "feedback-1",
        resultId: "result-1",
        userId: "7",
        userEmail: "reviewer@example.com",
        type: "EXPLANATION",
        order: 1,
        value: { clarity: 5 },
        createdAt: "2026-06-02T10:00:00Z",
      },
    ];

    const exported = buildSchemaRunExport([run], version, feedback);

    expect(exported.content).toContain("report.crystal_1.content");
    expect(exported.content).toContain("report.crystal_1.clarity.reviewer@example.com");
    expect(exported.content).toContain("tree path");
    expect(exported.content).not.toContain('"{""explanation"":""tree path""}"');
    expect(exported.content).toContain("5");
  });
});
