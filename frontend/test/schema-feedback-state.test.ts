/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  isCombinedSchemaFeedbackComplete,
  isSchemaFeedbackComplete,
  schemaFeedbackStatus,
} from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
} from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { saveSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-save";

const feedback = (resultId: string, value: Record<string, unknown>, id = "feedback-1") => ({
  id,
  resultId,
  userId: "user-1",
  userEmail: "reviewer@example.com",
  type: "OUTPUT" as const,
  order: 0,
  value,
  createdAt: "2026-06-04T00:00:00Z",
});

const step = (
  value?: Record<string, unknown>,
  fields = [{ id: "assessment", kind: "rating", label: "Assessment" }],
): SchemaFeedbackStep => ({
  id: "result-1-output-0",
  kind: "OUTPUT",
  type: "OUTPUT",
  targets: [
    {
      resultId: "result-1",
      modelId: "model-1",
      feedback: value ? feedback("result-1", value) : undefined,
    },
  ],
  order: 0,
  title: "Result",
  description: "Prediction result",
  schema: {
    steps: [
      {
        id: "output-feedback",
        title: "Output feedback",
        fields,
      },
    ],
  },
  initialValues: value ?? {},
});

describe("schema feedback state", () => {
  test("honors explicitly optional answers while requiring saved feedback", () => {
    const optional = step({ assessment: "yes" });
    optional.schema.steps[0]!.fields.push({
      id: "note",
      label: "Note",
      kind: "text",
      required: false,
    });
    const combined = buildCombinedFeedbackQuestionnaire([optional], { required: true });
    expect(combined.schema.steps[0]?.fields[1]?.required).toBe(false);
    expect(isSchemaFeedbackComplete([optional])).toBe(true);
    expect(
      isCombinedSchemaFeedbackComplete([optional], { [`${optional.id}-assessment`]: "yes" }),
    ).toBe(true);
    expect(isCombinedSchemaFeedbackComplete([optional], {})).toBe(false);
    optional.targets[0]!.feedback = undefined;
    expect(isSchemaFeedbackComplete([optional])).toBe(false);
  });
  test("distinguishes absent questionnaires from pending and complete feedback", () => {
    expect(schemaFeedbackStatus([])).toBe("NOT_REQUIRED");
    expect(schemaFeedbackStatus([step()])).toBe("PENDING");
    expect(schemaFeedbackStatus([step({ assessment: "yes" })])).toBe("COMPLETED");
  });
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

  test("does not complete when one mapped result lacks feedback", () => {
    const shared = step({ assessment: 4 });
    shared.targets.push({ resultId: "result-2", modelId: "model-2" });

    expect(isSchemaFeedbackComplete([shared])).toBe(false);
  });

  test("does not complete when mapped results have divergent feedback", () => {
    const shared = step({ assessment: 4 });
    shared.targets.push({
      resultId: "result-2",
      modelId: "model-2",
      feedback: feedback("result-2", { assessment: 2 }, "feedback-2"),
    });

    expect(isSchemaFeedbackComplete([shared])).toBe(false);
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

  test("persists field answers when model serialization is empty", async () => {
    let submitted: Record<string, unknown> | undefined;
    const transport = createCombinedQuestionnaireTransport(async (values) => {
      submitted = values;
    });

    await transport.submit({
      inputs: [
        {
          fieldId: "result-1-output-0-assessment",
          label: "Assessment",
          value: 4,
          serializedValue: 4,
          modelValues: {},
          visible: true,
          disabled: false,
        },
      ],
      displayValues: {},
      modelValues: {},
      fields: [],
      reports: [],
    });

    expect(submitted).toEqual({ "result-1-output-0-assessment": 4 });
  });

  test("fans saved values out through create and update targets", async () => {
    const shared = step({ assessment: 2 });
    shared.targets.push({ resultId: "result-2", modelId: "model-2" });
    const writes: string[] = [];

    await saveSchemaFeedbackSteps(
      [shared],
      { "result-1-output-0-assessment": 5 },
      {
        create: async (_step, target, value) => {
          writes.push(`create:${target.resultId}:${String(value.assessment)}`);
        },
        update: async (_step, target, _feedback, value) => {
          writes.push(`update:${target.resultId}:${String(value.assessment)}`);
        },
      },
    );

    expect(writes.sort()).toEqual(["create:result-2:5", "update:result-1:5"]);
  });

  test("propagates a target persistence failure", async () => {
    await expect(
      saveSchemaFeedbackSteps(
        [step()],
        { "result-1-output-0-assessment": 5 },
        {
          create: async () => {
            throw new Error("save failed");
          },
          update: async () => undefined,
        },
      ),
    ).rejects.toThrow("save failed");
  });
});
