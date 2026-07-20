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
  const reports = Array.isArray(base.reports) ? base.reports.filter(isRecord) : [];
  const meta = isRecord(base.meta) ? { ...base.meta } : {};

  for (const report of feedbackReports) {
    if (report.status === "done" && report.result !== undefined) {
      const next = { id: report.id, payload: report.result };
      const index = reports.findIndex((item) => String(item.id) === report.id);
      if (index >= 0) reports[index] = next;
      else reports.push(next);
    }
  }

  return {
    ...base,
    reports,
    meta,
  };
}
