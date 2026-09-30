/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { WizardLayoutConfig } from "mlform/kit";
import type { FieldConfig, FormSchema } from "mlform/runtime";

export type QuestionnaireStep = {
  id: string;
  title: string;
  fields: FieldConfig[];
};

export type QuestionnaireSchema = {
  steps: QuestionnaireStep[];
};

const fieldIdFromLabel = (label: unknown, index: number) =>
  typeof label === "string" && label.trim()
    ? label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    : `field-${index + 1}`;

const fieldWithId = (step: QuestionnaireStep, field: FieldConfig, index: number): FieldConfig => ({
  ...field,
  id: field.id ?? `${step.id}-${fieldIdFromLabel(field.label, index)}`,
});

export const buildQuestionnaireFormSchema = (schema: QuestionnaireSchema): FormSchema => ({
  fields: schema.steps.flatMap((step) =>
    step.fields.map((field, index) => fieldWithId(step, field, index)),
  ),
  reports: [],
});

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
