/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { toMlformSchema } from "../../mlform/schema-validation";
import { getQuestionnaireFieldIds } from "../questionnaire-feedback";
import type { QuestionnaireSchema } from "../questionnaire-schema";

const isPlainObject = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

const isQuestionnaireSchema = (value: unknown): value is QuestionnaireSchema =>
  isPlainObject(value) && Array.isArray((value as { steps?: unknown }).steps);

export const toRecord = (value: Record<string, unknown>): Record<string, unknown> =>
  value instanceof Map ? Object.fromEntries(value.entries()) : (value ?? {});

export const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (Array.isArray(obj)) {
    obj.forEach((value, index) =>
      Object.assign(out, flatten(value, prefix ? `${prefix}.${index}` : String(index))),
    );
  } else if (isPlainObject(obj)) {
    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) =>
      Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key)),
    );
  } else {
    out[prefix || "value"] = obj;
  }
  return out;
};

export const toCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const csvEscape = (value: string, separator: string) => {
  let next = value;
  if (next.includes('"')) next = next.replace(/"/g, '""');
  if (next.includes(separator) || next.includes("\n") || next.includes("\r")) next = `"${next}"`;
  return next;
};

export const getReportFeedbackHeaders = (
  schemaDefinition: unknown,
  reviewerLabels: readonly string[] = [],
): string[] => {
  try {
    const schema = toMlformSchema(schemaDefinition);

    return (schema.reports ?? []).flatMap((report: ReportConfig) => {
      const questionnaire = (report as Record<string, unknown>).feedbackQuestionnaire;
      if (!isQuestionnaireSchema(questionnaire)) {
        return [];
      }
      return [
        `report.${report.id}.content`,
        ...(questionnaire
          ? getQuestionnaireFieldIds(questionnaire).flatMap((fieldId) =>
              reviewerLabels.map((reviewer) => `report.${report.id}.${fieldId}.${reviewer}`),
            )
          : []),
      ];
    });
  } catch {
    return [];
  }
};
