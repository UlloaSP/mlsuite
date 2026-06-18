/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { valuesForCombinedStep } from "../../../algorithms/models/combined-feedback-questionnaire";
import { hasFeedbackValues } from "../../models/questionnaire-feedback";
import type { SchemaFeedbackStep } from "../feedback-steps";

export type PendingFeedback = {
  modelId: string;
  type: "OUTPUT" | "EXPLANATION";
  order: number;
  value: Record<string, unknown>;
};

type PendingFeedbackResult = {
  id: string;
  modelId: string;
};

export const buildPendingSchemaRunFeedback = (
  feedbackSteps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
  results: readonly PendingFeedbackResult[],
): PendingFeedback[] =>
  feedbackSteps.flatMap((step): PendingFeedback[] => {
    const value = valuesForCombinedStep(values, step);
    if (!hasFeedbackValues(value)) return [];
    const result = results.find((item) => item.id === step.resultId);
    return [
      {
        modelId: result?.modelId ?? "",
        type: step.type,
        order: step.order,
        value,
      },
    ];
  });
