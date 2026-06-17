/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type FieldConfig } from "mlform/runtime";
import { buildQuestionnaireFormSchema, type QuestionnaireSchema } from "./questionnaire-schema";
import type { MountedForm } from "mlform/kit";

type JsonRecord = Record<string, unknown>;

type ReportFeedbackDto = {
  value?: unknown;
  realValue?: unknown;
};

export type PredictionReportDescriptor = {
  order: number;
  reportId: string;
  label: string;
  content: string[];
  error: string | null;
  feedbackQuestionnaire?: QuestionnaireSchema;
};

export type QuestionnaireFieldDescriptor = {
  id: string;
  label: string;
  kind: string;
  options?: Array<{ label: string; value: unknown }>;
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
  buildQuestionnaireFormSchema(schema).fields.map((field: { id?: string }) => String(field.id));

export const getQuestionnaireFieldDescriptors = (
  schema: QuestionnaireSchema,
): QuestionnaireFieldDescriptor[] => {
  const normalizedFields = buildQuestionnaireFormSchema(schema).fields;
  const sourceFields = schema.steps.flatMap((step) => step.fields);

  return normalizedFields.map((field: { id?: string; kind?: string }, index: number) => ({
    id: String(field.id),
    label: sourceFields[index]?.label ?? field.id,
    kind: typeof field.kind === "string" ? field.kind : "unknown",
    options: Array.isArray(sourceFields[index]?.options)
      ? sourceFields[index].options
          .filter(
            (option: unknown): option is { label: string; value: unknown } =>
              typeof option === "object" &&
              option !== null &&
              "label" in option &&
              typeof option.label === "string" &&
              "value" in option,
          )
          .map((option: { label: string; value: unknown }) => ({
            label: option.label,
            value: option.value,
          }))
      : undefined,
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
  feedback: Partial<Pick<ReportFeedbackDto, "value" | "realValue">> | undefined,
  schema?: QuestionnaireSchema,
): Record<string, unknown> =>
  normalizeFeedbackValues(feedback?.realValue ?? feedback?.value, schema);

export const hasFeedbackValues = (value: Record<string, unknown>): boolean =>
  Object.keys(value).length > 0;

export const formatFeedbackValue = (
  value: unknown,
  field?: Pick<QuestionnaireFieldDescriptor, "options">,
): string => {
  const matchingOption = field?.options?.find((option) => String(option.value) === String(value));
  if (matchingOption) {
    return matchingOption.label;
  }
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
  mounted: MountedForm | null | undefined,
): Promise<Record<string, unknown>> => {
  if (!mounted) {
    return {};
  }

  const result = await mounted.form.submit();
  return isRecord(result.serializedValues) ? result.serializedValues : {};
};

export const getQuestionnaireValues = (
  mounted: MountedForm | null | undefined,
): Record<string, unknown> => {
  if (!mounted || !isRecord(mounted.form.state.values)) {
    return {};
  }

  return mounted.form.state.values;
};
