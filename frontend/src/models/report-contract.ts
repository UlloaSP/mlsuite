/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isFeedbackReportConfig = (report: unknown): boolean =>
  isRecord(report) &&
  (() => {
    const config = isRecord(report.config) ? report.config : report;
    return (
      typeof config.feedbackEnabled === "boolean" || config.feedbackQuestionnaire !== undefined
    );
  })();

export const getOutputReports = (signatureSchema: unknown): Record<string, unknown>[] => {
  if (!isRecord(signatureSchema) || !Array.isArray(signatureSchema.reports)) {
    return [];
  }
  return signatureSchema.reports.reduce<Record<string, unknown>[]>((reports, report) => {
    if (isRecord(report) && !isFeedbackReportConfig(report)) {
      reports.push(report);
    }
    return reports;
  }, []);
};
