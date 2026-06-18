/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type JsonRecord = Record<string, unknown>;

/**
 * PersistedReportState: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: builds the persisted prediction payload from MLForm runtime output.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PersistedReportState = {
  id: string;
  status: "idle" | "loading" | "done" | "error";
  result?: unknown;
  error?: string | null;
};

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * buildPersistedPredictionPayload: constructs a new derived object from source data
 *
 * Purpose: builds the persisted prediction payload from MLForm runtime output.
 * @param raw - Input consumed by buildPersistedPredictionPayload; uses the builds the persisted prediction payload from MLForm runtime output contract.
 * @param feedbackReports - Input consumed by buildPersistedPredictionPayload; uses the builds the persisted prediction payload from MLForm runtime output contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
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
