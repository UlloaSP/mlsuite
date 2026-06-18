/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type FieldConfig } from "mlform/runtime";
import { buildQuestionnaireFormSchema, type QuestionnaireSchema } from "../questionnaire-schema";
import type { MountedForm } from "mlform/kit";

type JsonRecord = Record<string, unknown>;

type ReportFeedbackDto = {
  value?: unknown;
  realValue?: unknown;
};

/**
 * PredictionReportDescriptor: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PredictionReportDescriptor = {
  order: number;
  reportId: string;
  label: string;
  content: string[];
  error: string | null;
  feedbackQuestionnaire?: QuestionnaireSchema;
};

/**
 * QuestionnaireFieldDescriptor: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type QuestionnaireFieldDescriptor = {
  id: string;
  label: string;
  kind: string;
  options?: Array<{ label: string; value: unknown }>;
};

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** cloneField: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const cloneField = (field: FieldConfig, editable: boolean): FieldConfig =>
  editable
    ? { ...field }
    : {
        ...field,
        disabled: true,
        readOnly: true,
      };

/**
 * toQuestionnaireSchema: converts data into another contract shape
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toQuestionnaireSchema = (
  schema: QuestionnaireSchema,
  editable: boolean,
): QuestionnaireSchema => ({
  steps: schema.steps.map((step) => ({
    ...step,
    fields: step.fields.map((field) => cloneField(field, editable)),
  })),
});

/**
 * getQuestionnaireFieldIds: extracts a derived value without mutating input
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getQuestionnaireFieldIds = (schema: QuestionnaireSchema): string[] =>
  buildQuestionnaireFormSchema(schema).fields.map((field: { id?: string }) => String(field.id));

/**
 * getQuestionnaireFieldDescriptors: extracts a derived value without mutating input
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * normalizeFeedbackValues: normalizes loose runtime data into the app contract
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * getEffectiveFeedbackValues: extracts a derived value without mutating input
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getEffectiveFeedbackValues = (
  feedback: Partial<Pick<ReportFeedbackDto, "value" | "realValue">> | undefined,
  schema?: QuestionnaireSchema,
): Record<string, unknown> =>
  normalizeFeedbackValues(feedback?.realValue ?? feedback?.value, schema);

/**
 * hasFeedbackValues: returns whether the requested condition exists
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const hasFeedbackValues = (value: Record<string, unknown>): boolean =>
  Object.keys(value).length > 0;

/**
 * formatFeedbackValue: converts raw data into a stable human-readable string
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * submitQuestionnaire: performs the exported transformation for this algorithm.
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const submitQuestionnaire = async (
  mounted: MountedForm | null | undefined,
): Promise<Record<string, unknown>> => {
  if (!mounted) {
    return {};
  }

  const result = await mounted.form.submit();
  return isRecord(result.serializedValues) ? result.serializedValues : {};
};

/**
 * getQuestionnaireValues: extracts a derived value without mutating input
 *
 * Purpose: extracts, normalizes, formats, and submits questionnaire feedback values.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getQuestionnaireValues = (
  mounted: MountedForm | null | undefined,
): Record<string, unknown> => {
  if (!mounted || !isRecord(mounted.form.state.values)) {
    return {};
  }

  return mounted.form.state.values;
};
