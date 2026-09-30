/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaRunExport } from "@/features/schemas/lib/export";
import type { PredictionResultFeedbackDto } from "@/shared/api/openapi.gen";
import {
  binding,
  predictionResult,
  predictionRun,
  resultFeedback,
  schemaVersion,
} from "./support/api-fixtures";

const version = schemaVersion({
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [binding(1)],
  formSchema: {
    fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
    reports: [
      {
        id: "report_1",
        label: "Predicted class",
        kind: "classifier",
        mappedTo: { "model-1": "predicted_class" },
        labels: ["Low", "High"],
      },
      {
        id: "crystal_1",
        label: "Crystal Tree",
        kind: "Crystal Tree",
        mappedTo: { "model-1": "crystal" },
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
});

const run = predictionRun({
  name: "case-1",
  status: "SUCCESS",
  createdAt: "2026-06-02T10:00:00Z",
  inputData: { age: 52 },
  results: [
    predictionResult({
      id: 1,
      modelId: 1,
      status: "SUCCESS",
      createdAt: "2026-06-02T10:00:00Z",
      modelInput: { age: 52 },
      output: {
        reports: [
          { mappedTo: "predicted_class", prediction: 1, probabilities: [0.2, 0.8] },
          { mappedTo: "crystal", explanation: "tree path" },
        ],
      },
    }),
  ],
});

describe("schema run export parity", () => {
  test("exports report feedback with signature-style columns", () => {
    const feedback: PredictionResultFeedbackDto[] = [
      resultFeedback({
        id: 1,
        resultId: 1,
        userId: 7,
        userEmail: "reviewer@example.com",
        type: "EXPLANATION",
        order: 1,
        value: { clarity: 5 },
        createdAt: "2026-06-02T10:00:00Z",
      }),
    ];

    const exported = buildSchemaRunExport([run], version, feedback);

    expect(exported.content).toContain("report.crystal_1.content");
    expect(exported.content).toContain("report.crystal_1.clarity.reviewer@example.com");
    expect(exported.content).toContain("tree path");
    expect(exported.content).not.toContain('"{""explanation"":""tree path""}"');
    expect(exported.content).toContain("5");
  });
});
