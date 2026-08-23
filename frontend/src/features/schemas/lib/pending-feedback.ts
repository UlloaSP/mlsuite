/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { valuesForCombinedStep } from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import { hasFeedbackValues } from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";

/**
 * PendingFeedback: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: builds pending feedback payloads before schema run persistence.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PendingFeedback = {
  modelId: string;
  type: "OUTPUT" | "EXPLANATION";
  order: number;
  value: Record<string, unknown>;
};

/**
 * buildPendingSchemaRunFeedback: constructs a new derived object from source data
 *
 * Purpose: builds pending feedback payloads before schema run persistence.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const buildPendingSchemaRunFeedback = (
  feedbackSteps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
): PendingFeedback[] =>
  feedbackSteps.flatMap((step): PendingFeedback[] => {
    const value = valuesForCombinedStep(values, step);
    if (!hasFeedbackValues(value)) return [];
    return step.targets.map((target) => ({
      modelId: target.modelId,
      type: step.type,
      order: step.order,
      value,
    }));
  });
