/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";

const firstMappedTarget = (mappedTo: unknown): unknown => {
  if (!isRecord(mappedTo)) return mappedTo;
  return Object.values(mappedTo).find(
    (value) => typeof value === "string" || typeof value === "number",
  );
};

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
