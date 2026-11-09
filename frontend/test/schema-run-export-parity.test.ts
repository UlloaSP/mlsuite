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
          {
            id: "report_1",
            kind: "classifier",
            mappedTo: "predicted_class",
            prediction: "1",
            labels: ["0", "1"],
            probabilities: [0.2, 0.8],
          },
          { id: "crystal_1", kind: "Crystal Tree", mappedTo: "crystal", explanation: "tree path" },
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
        createdByUserId: 7,
        createdByEmail: "reviewer@example.com",
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

  test("exports a regressor's predicted value", () => {
    const regression = schemaVersion({
      bindings: [binding(1)],
      formSchema: {
        fields: [],
        reports: [
          { id: "body_mass", label: "Body mass", kind: "regressor", mappedTo: { "model-1": "0" } },
        ],
      },
    });
    const predictedCell = (values: number[]): string | undefined => {
      const stored = predictionRun({
        results: [
          predictionResult({
            output: {
              reports: [{ id: "body_mass", kind: "regressor", output: 0, mappedTo: "0", values }],
            },
          }),
        ],
      });
      const [header, row] = buildSchemaRunExport([stored], regression, [], ";")
        .content.replace("﻿", "")
        .split("\n")
        .map((line) => line.split(";"));
      return row[header.indexOf("output.body_mass.predicted")];
    };

    expect(predictedCell([3531.39])).toBe("3531.39");
  });

  test("exports who made each run and through which door", () => {
    const viaKey = predictionRun({
      ...run,
      id: 2,
      origin: "API",
      createdByName: "Lab2Pressure",
      createdByEmail: null,
    });
    const visitor = predictionRun({ ...run, id: 3, origin: "PUBLIC" });
    const member = predictionRun({ ...run, id: 4, createdByName: null, createdByEmail: "a@b.c" });

    const lines = buildSchemaRunExport([viaKey, visitor, member], version, [], ";")
      .content.replace("﻿", "")
      .split("\n")
      .map((line) => line.split(";"));

    const [header] = lines;
    expect(header.slice(0, 7)).toEqual([
      "inference_name",
      "run_id",
      "run_status",
      "created_at",
      "origin",
      "created_by",
      "model_count",
    ]);
    expect(lines.slice(1).map((cells) => cells.slice(4, 6))).toEqual([
      ["API", "Lab2Pressure"],
      ["PUBLIC", ""],
      ["WORKSPACE", "a@b.c"],
    ]);
  });

  test("exports each report on one output, and a reviewer's class as the label shown", () => {
    // Built from a model: no report ids, a class and its explanation read the same output.
    const fromModel = schemaVersion({
      bindings: [binding(1)],
      formSchema: {
        fields: [],
        reports: [
          {
            label: "Predicted class",
            kind: "classifier",
            mappedTo: { "model-1": 0 },
            labels: ["High risk", "Low risk"],
          },
          {
            label: "Why",
            kind: "Crystal Tree",
            mappedTo: { "model-1": 0 },
            feedbackQuestionnaire: {
              steps: [{ id: "why", fields: [{ kind: "rating", id: "clarity", label: "Clarity" }] }],
            },
          },
        ],
      },
    });
    const stored = predictionRun({
      results: [
        predictionResult({
          id: 1,
          output: {
            reports: [
              { kind: "classifier", output: 0, mapping: ["high", "low"], prediction: "low" },
              { kind: "Crystal Tree", explanation: "age > 50" },
              {
                id: "Predicted class",
                kind: "classifier",
                mappedTo: "0",
                labels: ["high", "low"],
                prediction: "low",
              },
              { id: "Why", kind: "Crystal Tree", mappedTo: "0", explanation: "age > 50" },
            ],
          },
        }),
      ],
    });
    const answer = (id: number, type: "OUTPUT" | "EXPLANATION", order: number, value: object) =>
      resultFeedback({ id, resultId: 1, createdByEmail: "r@x.org", type, order, value });
    const feedback = [
      answer(1, "OUTPUT", 0, { "output-feedback-assessment": "low" }),
      answer(2, "EXPLANATION", 1, { clarity: 4 }),
    ];

    const [header, row] = buildSchemaRunExport([stored], fromModel, feedback, ";")
      .content.replace("﻿", "")
      .split("\n")
      .map((line) => line.split(";"));
    const cell = (column: string) => row[header.indexOf(column)];

    expect(cell("output.Predicted class.predicted")).toBe("Low risk");
    expect(cell("output.Predicted class.feedback.r@x.org")).toBe("Low risk");
    expect(cell("report.Why.content")).toContain("age > 50");
    expect(cell("report.Why.clarity.r@x.org")).toBe("4");
  });
});
