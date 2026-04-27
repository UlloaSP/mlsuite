/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createBuiltinRegistry, type FieldConfig } from "mlform/engine";
import {
  normalizeQuestionnaireSchema,
  type MountedQuestionnaire,
  type QuestionnaireSchema,
} from "mlform/questionnaire";
import type { ExplanationFeedbackDto } from "./api/modelService";

type JsonRecord = Record<string, unknown>;

export type PredictionExplanationDescriptor = {
  order: number;
  explanationId: string;
  label: string;
  content: string[];
  error: string | null;
  feedbackQuestionnaire?: QuestionnaireSchema;
};

export type QuestionnaireFieldDescriptor = {
  id: string;
  label: string;
  kind: string;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneField = (field: FieldConfig, editable: boolean): FieldConfig =>
  editable
    ? { ...field }
    : {
        ...field,
        disabled: true,
        readOnly: true,
      };

export const toQuestionnaireSchema = (
  schema: QuestionnaireSchema,
  editable: boolean,
): QuestionnaireSchema => ({
  steps: schema.steps.map((step) => ({
    ...step,
    fields: step.fields.map((field) => cloneField(field, editable)),
  })),
});

export const getQuestionnaireFieldIds = (schema: QuestionnaireSchema): string[] =>
  normalizeQuestionnaireSchema(schema, createBuiltinRegistry()).formSchema.fields.map(
    (field: { id: string }) => field.id,
  );

export const getQuestionnaireFieldDescriptors = (
  schema: QuestionnaireSchema,
): QuestionnaireFieldDescriptor[] => {
  const normalizedFields = normalizeQuestionnaireSchema(schema, createBuiltinRegistry()).formSchema
    .fields;
  const sourceFields = schema.steps.flatMap((step) => step.fields);

  return normalizedFields.map((field: { id: string; kind?: string }, index: number) => ({
    id: field.id,
    label: sourceFields[index]?.label ?? field.id,
    kind: typeof field.kind === "string" ? field.kind : "unknown",
  }));
};

export const normalizeFeedbackValues = (
  value: unknown,
  schema?: QuestionnaireSchema,
): Record<string, unknown> => {
  if (!schema || !isRecord(value)) {
    return {};
  }

  const fieldIds = new Set(getQuestionnaireFieldIds(schema));
  return Object.fromEntries(Object.entries(value).filter(([key]) => fieldIds.has(key)));
};

export const getEffectiveFeedbackValues = (
  feedback: Partial<Pick<ExplanationFeedbackDto, "value" | "realValue">> | undefined,
  schema?: QuestionnaireSchema,
): Record<string, unknown> =>
  normalizeFeedbackValues(feedback?.realValue ?? feedback?.value, schema);

export const hasFeedbackValues = (value: Record<string, unknown>): boolean =>
  Object.keys(value).length > 0;

export const formatFeedbackValue = (value: unknown): string => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return JSON.stringify(value);
};

export const submitQuestionnaire = async (
  mounted: MountedQuestionnaire | null | undefined,
): Promise<Record<string, unknown>> => {
  if (!mounted) {
    return {};
  }

  const result = await mounted.form.submit();
  return isRecord(result.serializedValues) ? result.serializedValues : {};
};

export const getQuestionnaireValues = (
  mounted: MountedQuestionnaire | null | undefined,
): Record<string, unknown> => {
  if (!mounted || !isRecord(mounted.form.state.values)) {
    return {};
  }

  return mounted.form.state.values;
};
