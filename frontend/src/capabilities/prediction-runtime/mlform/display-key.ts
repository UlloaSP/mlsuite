/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  getString,
  isRecord,
  type JsonRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";

export const resolveDisplayKey = (field: JsonRecord): string | undefined =>
  getString(field.displayKey) ?? getString(field.label) ?? getString(field.id);

export const withResolvedDisplayKeys = (schema: unknown): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return schema;

  let changed = false;
  const fields = schema.fields.map((field) => {
    if (!isRecord(field) || getString(field.displayKey)) return field;
    const displayKey = resolveDisplayKey(field);
    if (!displayKey) return field;
    changed = true;
    return { ...field, displayKey };
  });

  return changed ? { ...schema, fields } : schema;
};
