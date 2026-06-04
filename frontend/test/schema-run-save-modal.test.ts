/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildPendingSchemaRunFeedback } from "../src/schemas/schema-run-save-feedback";
import type { SchemaFeedbackStep } from "../src/schemas/schema-feedback-steps";

const feedbackStep = (
  id: string,
  resultId: string,
  type: "OUTPUT" | "EXPLANATION",
  order: number,
  fieldId: string,
): SchemaFeedbackStep => ({
  id,
  kind: type,
  type,
  resultId,
  order,
  title: id,
  description: id,
  schema: {
    steps: [{ id: `${id}-step`, fields: [{ id: fieldId, kind: "text", label: fieldId }] }],
  },
  initialValues: {},
});

const results = [
  { id: "result-1", modelId: "model-1", signatureId: "signature-1" },
  { id: "result-2", modelId: "model-2", signatureId: "signature-2" },
];

describe("schema run save modal feedback", () => {
  test("skips feedback when questionnaire is empty", () => {
    const steps = [feedbackStep("result-1-output-0", "result-1", "OUTPUT", 0, "assessment")];

    expect(buildPendingSchemaRunFeedback(steps, {}, results)).toEqual([]);
  });

  test("saves a partially completed feedback step", () => {
    const steps = [
      feedbackStep("result-1-output-0", "result-1", "OUTPUT", 0, "assessment"),
      feedbackStep("result-1-report-0", "result-1", "EXPLANATION", 0, "note"),
    ];

    expect(
      buildPendingSchemaRunFeedback(steps, { "result-1-output-0-assessment": 4 }, results),
    ).toEqual([
      {
        modelId: "model-1",
        signatureId: "signature-1",
        type: "OUTPUT",
        order: 0,
        value: { assessment: 4 },
      },
    ]);
  });

  test("saves each filled feedback step independently", () => {
    const steps = [
      feedbackStep("result-1-output-0", "result-1", "OUTPUT", 0, "assessment"),
      feedbackStep("result-2-report-1", "result-2", "EXPLANATION", 1, "note"),
    ];

    expect(
      buildPendingSchemaRunFeedback(
        steps,
        {
          "result-1-output-0-assessment": 5,
          "result-2-report-1-note": "good",
        },
        results,
      ),
    ).toEqual([
      {
        modelId: "model-1",
        signatureId: "signature-1",
        type: "OUTPUT",
        order: 0,
        value: { assessment: 5 },
      },
      {
        modelId: "model-2",
        signatureId: "signature-2",
        type: "EXPLANATION",
        order: 1,
        value: { note: "good" },
      },
    ]);
  });
});
