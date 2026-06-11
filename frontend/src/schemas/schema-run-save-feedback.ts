/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { valuesForCombinedStep } from "../models/combined-feedback-questionnaire";
import { hasFeedbackValues } from "../models/questionnaire-feedback";
import type { SchemaFeedbackStep, SchemaFeedbackStepUsage } from "./schema-feedback-steps";

export type PendingFeedback = {
  modelId: string;
  signatureId: string;
  type: "OUTPUT" | "EXPLANATION";
  order: number;
  value: Record<string, unknown>;
};

type PendingFeedbackResult = {
  id: string;
  modelId: string;
  signatureId: string;
};

const stepUsages = (step: SchemaFeedbackStep): SchemaFeedbackStepUsage[] =>
  Array.isArray(step.usages)
    ? step.usages
    : [
        {
          resultId: step.resultId,
          modelId: "",
          signatureId: "",
          order: step.order,
          reportId: "",
          label: step.title,
          content: [],
          kind: step.kind,
        },
      ];

export const buildPendingSchemaRunFeedback = (
  feedbackSteps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
  results: readonly PendingFeedbackResult[],
): PendingFeedback[] =>
  feedbackSteps.flatMap((step): PendingFeedback[] => {
    const value = valuesForCombinedStep(values, step);
    if (!hasFeedbackValues(value)) return [];
    return stepUsages(step).map((usage) => {
      const result = results.find((item) => item.id === usage.resultId);
      return {
        modelId: result?.modelId ?? usage.modelId,
        signatureId: result?.signatureId ?? usage.signatureId,
        type: step.type,
        order: usage.order,
        value,
      };
    });
  });
