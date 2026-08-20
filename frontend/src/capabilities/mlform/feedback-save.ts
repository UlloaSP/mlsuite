/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { valuesForCombinedStep } from "@/capabilities/mlform/combined-feedback-questionnaire";
import type {
  SchemaFeedbackStep,
  SchemaFeedbackTarget,
} from "@/capabilities/mlform/feedback-steps";

type FeedbackWriter = {
  create: (
    step: SchemaFeedbackStep,
    target: SchemaFeedbackTarget,
    value: Record<string, unknown>,
  ) => Promise<unknown>;
  update: (
    step: SchemaFeedbackStep,
    target: SchemaFeedbackTarget,
    feedback: NonNullable<SchemaFeedbackTarget["feedback"]>,
    value: Record<string, unknown>,
  ) => Promise<unknown>;
};

/**
 * Persists each logical assessment to every result targeted by its source report.
 */
export const saveSchemaFeedbackSteps = async (
  steps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
  writer: FeedbackWriter,
): Promise<void> => {
  await Promise.all(
    steps.flatMap((step) => {
      const stepValues = valuesForCombinedStep(values, step);
      return step.targets.map((target) =>
        target.feedback
          ? writer.update(step, target, target.feedback, stepValues)
          : writer.create(step, target, stepValues),
      );
    }),
  );
};
