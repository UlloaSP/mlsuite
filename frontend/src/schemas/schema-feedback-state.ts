/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { valuesForCombinedStep } from "../models/combined-feedback-questionnaire";
import {
  getEffectiveFeedbackValues,
  getQuestionnaireFieldIds,
} from "../models/questionnaire-feedback";
import type { SchemaFeedbackStep } from "./schema-feedback-steps";

const isFilledFeedbackValue = (value: unknown): boolean =>
  value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);

const hasCompleteSavedSchemaFeedback = (step: SchemaFeedbackStep): boolean => {
  const fieldIds = getQuestionnaireFieldIds(step.schema);
  const values = getEffectiveFeedbackValues(step.feedback, step.schema);
  return fieldIds.length > 0 && fieldIds.every((fieldId) => isFilledFeedbackValue(values[fieldId]));
};

export const isSchemaFeedbackComplete = (steps: readonly SchemaFeedbackStep[]): boolean =>
  steps.length > 0 && steps.every(hasCompleteSavedSchemaFeedback);

export const isCombinedSchemaFeedbackComplete = (
  steps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
): boolean =>
  steps.length > 0 &&
  steps.every((step) => {
    const fieldIds = getQuestionnaireFieldIds(step.schema);
    const stepValues = valuesForCombinedStep(values, step);
    return (
      fieldIds.length > 0 && fieldIds.every((fieldId) => isFilledFeedbackValue(stepValues[fieldId]))
    );
  });
