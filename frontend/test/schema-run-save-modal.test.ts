/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildPendingSchemaRunFeedback } from "@/features/schemas/lib/pending-feedback";
import type { SchemaFeedbackStep } from "@/capabilities/mlform/feedback-steps";

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
  targets: [{ resultId, modelId: resultId.replace("result", "model") }],
  order,
  title: id,
  description: id,
  schema: {
    steps: [
      {
        id: `${id}-step`,
        title: id,
        fields: [{ id: fieldId, kind: "text", label: fieldId }],
      },
    ],
  },
  initialValues: {},
});

describe("schema run save modal feedback", () => {
  test("skips feedback when questionnaire is empty", () => {
    const steps = [feedbackStep("result-1-output-0", "result-1", "OUTPUT", 0, "assessment")];

    expect(buildPendingSchemaRunFeedback(steps, {})).toEqual([]);
  });

  test("saves a partially completed feedback step", () => {
    const steps = [
      feedbackStep("result-1-output-0", "result-1", "OUTPUT", 0, "assessment"),
      feedbackStep("result-1-report-0", "result-1", "EXPLANATION", 0, "note"),
    ];

    expect(buildPendingSchemaRunFeedback(steps, { "result-1-output-0-assessment": 4 })).toEqual([
      {
        modelId: "model-1",
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
      buildPendingSchemaRunFeedback(steps, {
        "result-1-output-0-assessment": 5,
        "result-2-report-1-note": "good",
      }),
    ).toEqual([
      {
        modelId: "model-1",
        type: "OUTPUT",
        order: 0,
        value: { assessment: 5 },
      },
      {
        modelId: "model-2",
        type: "EXPLANATION",
        order: 1,
        value: { note: "good" },
      },
    ]);
  });

  test("fans one logical assessment out to every mapped model", () => {
    const step = feedbackStep("report-0-output", "result-1", "OUTPUT", 0, "assessment");
    step.targets.push({ resultId: "result-2", modelId: "model-2" });

    expect(
      buildPendingSchemaRunFeedback([step], { "report-0-output-assessment": "approved" }),
    ).toEqual([
      {
        modelId: "model-1",
        type: "OUTPUT",
        order: 0,
        value: { assessment: "approved" },
      },
      {
        modelId: "model-2",
        type: "OUTPUT",
        order: 0,
        value: { assessment: "approved" },
      },
    ]);
  });
});
