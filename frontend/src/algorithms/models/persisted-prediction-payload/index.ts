/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type JsonRecord = Record<string, unknown>;

export type PersistedReportState = {
  id: string;
  status: "idle" | "loading" | "done" | "error";
  result?: unknown;
  error?: string | null;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function buildPersistedPredictionPayload(
  raw: unknown,
  feedbackReports: readonly PersistedReportState[],
): Record<string, unknown> {
  const base = isRecord(raw) ? raw : { raw };
  const reports = isRecord(base.reports) ? { ...base.reports } : {};
  const meta = isRecord(base.meta) ? { ...base.meta } : {};
  const explainErrors = isRecord(meta.explainErrors) ? { ...meta.explainErrors } : {};

  for (const report of feedbackReports) {
    if (report.status === "done" && report.result !== undefined) {
      reports[report.id] = report.result;
      delete explainErrors[report.id];
    }
    if (report.status === "error" && report.error) {
      explainErrors[report.id] = report.error;
    }
  }

  const nextMeta: JsonRecord = { ...meta };
  if (Object.keys(explainErrors).length > 0) {
    nextMeta.explainErrors = explainErrors;
  } else {
    delete nextMeta.explainErrors;
  }

  return {
    ...base,
    reports,
    meta: nextMeta,
  };
}
