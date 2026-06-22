/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * isFeedbackReportConfig: returns a boolean guard/result for the requested predicate
 *
 * Purpose: identifies feedback-capable reports and output report lists.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isFeedbackReportConfig = (report: unknown): boolean =>
  isRecord(report) &&
  (() => {
    const config = isRecord(report.config) ? report.config : report;
    return (
      typeof config.feedbackEnabled === "boolean" || config.feedbackQuestionnaire !== undefined
    );
  })();

/**
 * getOutputReports: extracts a derived value without mutating input
 *
 * Purpose: identifies feedback-capable reports and output report lists.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getOutputReports = (schemaDefinition: unknown): Record<string, unknown>[] => {
  if (!isRecord(schemaDefinition) || !Array.isArray(schemaDefinition.reports)) {
    return [];
  }
  return schemaDefinition.reports.reduce<Record<string, unknown>[]>((reports, report) => {
    if (isRecord(report) && !isFeedbackReportConfig(report)) {
      reports.push(report);
    }
    return reports;
  }, []);
};
