/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";

/** Where a form report's result is stored within one model's output. */
export type StoredReportRoute = {
  /** The id its stored copy carries: see {@link storedReportId}. */
  storedId: string;
  /** The model output the report reads. */
  target: string;
};

/**
 * The id a run stores a form report's copy under: the report's id, else its label, else its
 * position in the form. The API names stored copies by the same rule (PublicRunReports.storedId).
 */
export const storedReportId = (report: unknown, order: number): string => {
  const config = isRecord(report) ? report : {};
  if (typeof config.id === "string") return config.id;
  if (typeof config.label === "string") return config.label;
  return String(order);
};

/**
 * The copy a run stored of one form report in a model's output. A run stores, after the
 * runtime's own reports, one copy per form report the model answered, with `id` = the report's
 * stored id and `mappedTo` = the output it read. Two reports may read the same output (a class
 * and its explanation), so the output alone does not tell them apart. The API reads stored copies
 * by this same rule (PublicRunReports.storedCopy).
 */
export const findStoredReport = (
  output: JsonRecord,
  { storedId, target }: StoredReportRoute,
): JsonRecord | undefined =>
  (Array.isArray(output.reports) ? output.reports.filter(isRecord) : []).find(
    (copy) => copy.id === storedId && String(copy.mappedTo) === target,
  );
