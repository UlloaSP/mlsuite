import { valuesForCombinedStep } from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import {
  getEffectiveFeedbackValues,
  getQuestionnaireFieldIds,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";

const isFilledFeedbackValue = (value: unknown): boolean =>
  value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);

const hasCompleteSavedSchemaFeedback = (step: SchemaFeedbackStep): boolean => {
  const fieldIds = getQuestionnaireFieldIds(step.schema);
  const values = step.targets.map((target) =>
    getEffectiveFeedbackValues(target.feedback, step.schema),
  );
  const first = values[0];
  return (
    fieldIds.length > 0 &&
    first !== undefined &&
    values.length === step.targets.length &&
    values.every(
      (value) =>
        fieldIds.every((fieldId) => isFilledFeedbackValue(value[fieldId])) &&
        fieldIds.every(
          (fieldId) => JSON.stringify(value[fieldId]) === JSON.stringify(first[fieldId]),
        ),
    )
  );
};

export const countCompletedSchemaFeedbackSteps = (steps: readonly SchemaFeedbackStep[]): number =>
  steps.filter(hasCompleteSavedSchemaFeedback).length;

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
