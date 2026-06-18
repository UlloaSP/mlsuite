import type { FieldConfig, SubmitRequest, Transport } from "mlform/runtime";
import { buildQuestionnaireFormSchema, type QuestionnaireSchema } from "../questionnaire-schema";

/**
 * CombinedFeedbackStep: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: combines output and report questionnaire feedback into one MLForm questionnaire flow.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/** fieldId: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldId = (field: FieldConfig, fallback: string): string =>
  typeof field.id === "string" && field.id.trim().length > 0 ? field.id : fallback;

/** prefix: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const prefix = (stepId: string, id: string): string => `${stepId}-${id}`;

/**
 * buildCombinedFeedbackQuestionnaire: constructs a new derived object from source data
 *
 * Purpose: combines output and report questionnaire feedback into one MLForm questionnaire flow.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * valuesForCombinedStep: performs the exported transformation for this algorithm.
 *
 * Purpose: combines output and report questionnaire feedback into one MLForm questionnaire flow.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * createCombinedQuestionnaireTransport: creates a configured runtime object or schema object
 *
 * Purpose: combines output and report questionnaire feedback into one MLForm questionnaire flow.
 * @param onSubmit - Input consumed by createCombinedQuestionnaireTransport; uses the combines output and report questionnaire feedback into one MLForm questionnaire flow contract.
 * @param unknown - Input consumed by createCombinedQuestionnaireTransport; uses the combines output and report questionnaire feedback into one MLForm questionnaire flow contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
