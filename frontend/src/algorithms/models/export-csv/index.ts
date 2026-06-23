/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { toMlformSchema } from "../../mlform/schema-validation";
import { getQuestionnaireFieldIds } from "../questionnaire-feedback";
import type { QuestionnaireSchema } from "../questionnaire-schema";

/** isPlainObject: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: value; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isPlainObject = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

/** isQuestionnaireSchema: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isQuestionnaireSchema = (value: unknown): value is QuestionnaireSchema =>
  isPlainObject(value) && Array.isArray((value as { steps?: unknown }).steps);

/**
 * toRecord: converts data into another contract shape
 *
 * Purpose: flattens prediction/report/feedback data into CSV-safe export cells and headers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toRecord = (value: Record<string, unknown>): Record<string, unknown> =>
  value instanceof Map ? Object.fromEntries(value.entries()) : (value ?? {});

/**
 * flatten: performs the exported transformation for this algorithm.
 *
 * Purpose: flattens prediction/report/feedback data into CSV-safe export cells and headers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * toCell: converts data into another contract shape
 *
 * Purpose: flattens prediction/report/feedback data into CSV-safe export cells and headers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/**
 * csvEscape: performs the exported transformation for this algorithm.
 *
 * Purpose: flattens prediction/report/feedback data into CSV-safe export cells and headers.
 * @param value - Input consumed by csvEscape; uses the flattens prediction/report/feedback data into CSV-safe export cells and headers contract.
 * @param separator - Input consumed by csvEscape; uses the flattens prediction/report/feedback data into CSV-safe export cells and headers contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const csvEscape = (value: string, separator: string) => {
  let next = value;
  if (next.includes('"')) next = next.replace(/"/g, '""');
  if (next.includes(separator) || next.includes("\n") || next.includes("\r")) next = `"${next}"`;
  return next;
};

/**
 * getReportFeedbackHeaders: extracts a derived value without mutating input
 *
 * Purpose: flattens prediction/report/feedback data into CSV-safe export cells and headers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
