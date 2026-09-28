import { valuesForCombinedStep } from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import {
  agreedFeedbackValues,
  getQuestionnaireFieldIds,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { buildQuestionnaireFormSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import type { FieldConfig } from "mlform/runtime";

const requiredFieldIds = (step: SchemaFeedbackStep): string[] =>
  buildQuestionnaireFormSchema(step.schema)
    .fields.filter((field: FieldConfig) => field.required !== false)
    .map((field: FieldConfig) => String(field.id));

const isFilledFeedbackValue = (value: unknown): boolean =>
  value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);

const hasCompleteSavedSchemaFeedback = (step: SchemaFeedbackStep): boolean => {
  if (getQuestionnaireFieldIds(step.schema).length === 0) return false;
  const agreed = agreedFeedbackValues(step.targets, step.schema);
  return (
    agreed !== null &&
    requiredFieldIds(step).every((fieldId) => isFilledFeedbackValue(agreed[fieldId]))
  );
};

export const isSchemaFeedbackComplete = (steps: readonly SchemaFeedbackStep[]): boolean =>
  steps.length > 0 && steps.every(hasCompleteSavedSchemaFeedback);

export type SchemaFeedbackStatus = "COMPLETED" | "PENDING" | "NOT_REQUIRED";
export const schemaFeedbackStatus = (steps: readonly SchemaFeedbackStep[]): SchemaFeedbackStatus =>
  steps.length === 0 ? "NOT_REQUIRED" : isSchemaFeedbackComplete(steps) ? "COMPLETED" : "PENDING";

export const isCombinedSchemaFeedbackComplete = (
  steps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
): boolean =>
  steps.length > 0 &&
  steps.every((step) => {
    const fieldIds = requiredFieldIds(step);
    const stepValues = valuesForCombinedStep(values, step);
    return fieldIds.every((fieldId) => isFilledFeedbackValue(stepValues[fieldId]));
  });
