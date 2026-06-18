import type { FieldConfig, SubmitRequest, Transport } from "mlform/runtime";
import { buildQuestionnaireFormSchema, type QuestionnaireSchema } from "../questionnaire-schema";

export type CombinedFeedbackStep<TKind extends string = string, TFeedback = unknown> = {
  id: string;
  kind: TKind;
  order: number;
  title: string;
  description: string;
  schema: QuestionnaireSchema;
  initialValues: Record<string, unknown>;
  feedback?: TFeedback;
};

type BuildCombinedFeedbackQuestionnaireOptions = {
  required?: boolean;
};

const fieldId = (field: FieldConfig, fallback: string): string =>
  typeof field.id === "string" && field.id.trim().length > 0 ? field.id : fallback;

const prefix = (stepId: string, id: string): string => `${stepId}-${id}`;

export const buildCombinedFeedbackQuestionnaire = (
  steps: readonly CombinedFeedbackStep[],
  options: BuildCombinedFeedbackQuestionnaireOptions = {},
): { schema: QuestionnaireSchema; initialValues: Record<string, unknown> } => {
  const initialValues: Record<string, unknown> = {};
  const schema: QuestionnaireSchema = {
    steps: steps.map((step) => {
      const fields = buildQuestionnaireFormSchema(step.schema).fields.map(
        (field: FieldConfig, index: number) => {
          const sourceId = fieldId(field, `field-${index + 1}`);
          const nextId = prefix(step.id, sourceId);
          if (sourceId in step.initialValues) {
            initialValues[nextId] = step.initialValues[sourceId];
          }
          return { ...field, id: nextId, required: options.required ? true : field.required };
        },
      );
      return {
        id: step.id,
        title: step.title,
        description: step.description,
        fields,
      };
    }),
  };
  return { schema, initialValues };
};

export const valuesForCombinedStep = (
  allValues: Record<string, unknown>,
  step: CombinedFeedbackStep,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  buildQuestionnaireFormSchema(step.schema).fields.forEach((field: FieldConfig, index: number) => {
    const sourceId = fieldId(field, `field-${index + 1}`);
    const value = allValues[prefix(step.id, sourceId)];
    if (value !== undefined) result[sourceId] = value;
  });
  return result;
};

export const createCombinedQuestionnaireTransport = (
  onSubmit: (values: Record<string, unknown>) => Promise<void>,
): Transport => ({
  async submit(request: SubmitRequest) {
    const values =
      typeof request.serializedValues === "object" && request.serializedValues !== null
        ? (request.serializedValues as Record<string, unknown>)
        : {};
    await onSubmit(values);
    return { raw: values, meta: {}, reports: {} };
  },
});
