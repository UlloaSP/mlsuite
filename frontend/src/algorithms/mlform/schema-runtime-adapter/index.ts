/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";

/**
 * toMlformRuntimeSchema: converts data into another contract shape
 *
 * Purpose: adapts persisted schema JSON into the runtime MLForm schema contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toMlformRuntimeSchema = (schema: unknown): unknown => {
  if (!isRecord(schema)) return schema;
  const adaptItem = (item: unknown): unknown => {
    if (!isRecord(item)) return item;
    const next: JsonRecord = { ...item };
    if (typeof next.displayKey !== "string" || next.displayKey.trim().length === 0) {
      next.displayKey = typeof next.label === "string" && next.label.trim() ? next.label : next.id;
    }
    if (Array.isArray(next.options)) next.options = next.options.map(adaptItem);
    return next;
  };
  const reportTargets = Array.isArray(schema.reports)
    ? schema.reports.flatMap((report) =>
        isRecord(report) && isRecord(report.mappedTo)
          ? Object.values(report.mappedTo).filter(
              (value) => typeof value === "string" || typeof value === "number",
            )
          : [],
      )
    : [];
  const uniqueReportTarget = (target: string | number): boolean =>
    reportTargets.filter((value) => String(value) === String(target)).length === 1;
  const adaptReport = (item: unknown): unknown => {
    if (!isRecord(item) || !isRecord(item.mappedTo) || item.mappedTo.default !== undefined) {
      return item;
    }
    const targets = Object.values(item.mappedTo).filter(
      (value) => typeof value === "string" || typeof value === "number",
    );
    return targets.length === 1 && uniqueReportTarget(targets[0])
      ? { ...item, mappedTo: { ...item.mappedTo, default: targets[0] } }
      : item;
  };
  return {
    ...schema,
    fields: Array.isArray(schema.fields) ? schema.fields.map(adaptItem) : schema.fields,
    reports: Array.isArray(schema.reports) ? schema.reports.map(adaptReport) : schema.reports,
  };
};
