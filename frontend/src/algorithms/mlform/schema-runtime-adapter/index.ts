/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";

/** firstMappedTarget: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const firstMappedTarget = (mappedTo: unknown): unknown => {
  if (!isRecord(mappedTo)) return mappedTo;
  return Object.values(mappedTo).find(
    (value) => typeof value === "string" || typeof value === "number",
  );
};

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
  const collapseItem = (item: unknown): unknown => {
    if (!isRecord(item)) return item;
    const next: JsonRecord = { ...item };
    if ("mappedTo" in next) next.mappedTo = firstMappedTarget(next.mappedTo);
    if (Array.isArray(next.options)) next.options = next.options.map(collapseItem);
    return next;
  };
  return {
    ...schema,
    fields: Array.isArray(schema.fields) ? schema.fields.map(collapseItem) : schema.fields,
    reports: Array.isArray(schema.reports) ? schema.reports.map(collapseItem) : schema.reports,
  };
};
