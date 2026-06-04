/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  isCombinedSchemaFeedbackComplete,
  isSchemaFeedbackComplete,
} from "../src/schemas/schema-feedback-state";
import { buildCombinedFeedbackQuestionnaire } from "../src/models/combined-feedback-questionnaire";
import type { SchemaFeedbackStep } from "../src/schemas/schema-feedback-steps";

const step = (
  value?: Record<string, unknown>,
  fields = [{ id: "assessment", kind: "rating", label: "Assessment" }],
): SchemaFeedbackStep => ({
  id: "result-1-output-0",
  kind: "OUTPUT",
  type: "OUTPUT",
  resultId: "result-1",
  order: 0,
  title: "Result",
  description: "Prediction result",
  schema: {
    steps: [
      {
        id: "output-feedback",
        fields,
      },
    ],
  },
  initialValues: value ?? {},
  feedback: value
    ? {
        id: "feedback-1",
        resultId: "result-1",
        userId: "user-1",
        userEmail: "reviewer@example.com",
        type: "OUTPUT",
        order: 0,
        value,
        createdAt: "2026-06-04T00:00:00Z",
      }
    : undefined,
});

describe("schema feedback state", () => {
  test("does not complete when no feedback exists", () => {
    expect(isSchemaFeedbackComplete([step()])).toBe(false);
  });

  test("does not complete when saved feedback has no questionnaire values", () => {
    expect(isSchemaFeedbackComplete([step({})])).toBe(false);
  });

  test("does not complete when saved feedback is partial", () => {
    expect(
      isSchemaFeedbackComplete([
        step({ clarity: 4 }, [
          { id: "clarity", kind: "rating", label: "Clarity" },
          { id: "trust", kind: "rating", label: "Trust" },
        ]),
      ]),
    ).toBe(false);
  });

  test("completes when saved feedback has all questionnaire values", () => {
    expect(isSchemaFeedbackComplete([step({ assessment: 4 })])).toBe(true);
  });

  test("does not complete local saved values when combined questionnaire is partial", () => {
    const steps = [
      step(undefined, [
        { id: "clarity", kind: "rating", label: "Clarity" },
        { id: "trust", kind: "rating", label: "Trust" },
      ]),
    ];
    expect(isCombinedSchemaFeedbackComplete(steps, { "result-1-output-0-clarity": 4 })).toBe(false);
  });

  test("completes local saved values when combined questionnaire has all fields", () => {
    expect(isCombinedSchemaFeedbackComplete([step()], { "result-1-output-0-assessment": 4 })).toBe(
      true,
    );
  });

  test("detail questionnaire can require every feedback field", () => {
    const combined = buildCombinedFeedbackQuestionnaire([step()], { required: true });

    expect(combined.schema.steps[0]?.fields[0]?.required).toBe(true);
  });
});
