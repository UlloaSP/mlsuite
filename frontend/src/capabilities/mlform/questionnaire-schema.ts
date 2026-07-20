/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { WizardLayoutConfig } from "mlform/kit";
import type { FieldConfig, FormSchema } from "mlform/runtime";

/**
 * QuestionnaireStep: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: builds MLForm questionnaire schemas and wizard layouts.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type QuestionnaireStep = {
  id: string;
  title: string;
  fields: FieldConfig[];
};

/**
 * QuestionnaireSchema: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: builds MLForm questionnaire schemas and wizard layouts.
 * @param label - Input consumed by QuestionnaireSchema; uses the builds MLForm questionnaire schemas and wizard layouts contract.
 * @param index - Input consumed by QuestionnaireSchema; uses the builds MLForm questionnaire schemas and wizard layouts contract.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type QuestionnaireSchema = {
  steps: QuestionnaireStep[];
};

/** fieldIdFromLabel: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: label, index; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldIdFromLabel = (label: unknown, index: number) =>
  typeof label === "string" && label.trim()
    ? label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    : `field-${index + 1}`;

/** fieldWithId: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldWithId = (step: QuestionnaireStep, field: FieldConfig, index: number): FieldConfig => ({
  ...field,
  id: field.id ?? `${step.id}-${fieldIdFromLabel(field.label, index)}`,
});

/**
 * buildQuestionnaireFormSchema: constructs a new derived object from source data
 *
 * Purpose: builds MLForm questionnaire schemas and wizard layouts.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const buildQuestionnaireFormSchema = (schema: QuestionnaireSchema): FormSchema => ({
  fields: schema.steps.flatMap((step) =>
    step.fields.map((field, index) => fieldWithId(step, field, index)),
  ),
  reports: [],
});

/**
 * buildQuestionnaireWizardLayout: constructs a new derived object from source data
 *
 * Purpose: builds MLForm questionnaire schemas and wizard layouts.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const buildQuestionnaireWizardLayout = (
  schema: QuestionnaireSchema,
): WizardLayoutConfig => ({
  kind: "wizard",
  steps: schema.steps.map((step) => ({
    id: step.id,
    title: step.title,
    children: step.fields.map((field, index) => ({
      kind: "field",
      field: String(fieldWithId(step, field, index).id),
    })),
  })),
});
