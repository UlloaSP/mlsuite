/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "./shared";

const hasPairConfig = (
  field: Record<string, unknown>,
): field is Record<string, unknown> & {
  field1: Record<string, unknown>;
  field2: Record<string, unknown>;
} =>
  field.kind === "series" &&
  field.columns === undefined &&
  isRecord(field.field1) &&
  isRecord(field.field2);

/** Persisted two-column schemas keep their original row keys and model payloads. */
export const seriesInputValue = (field: Record<string, unknown>, value: unknown): unknown => {
  if (!hasPairConfig(field) || !Array.isArray(value)) return value;
  return value.flatMap((point) => {
    if (Array.isArray(point)) {
      return point.length >= 2 ? [{ field1: point[0], field2: point[1] }] : [];
    }
    if (!isRecord(point)) return [];
    if ("field1" in point || "field2" in point) return [point];
    const values = Object.values(point);
    return values.length >= 2 ? [{ field1: values[0], field2: values[1] }] : [];
  });
};

/** Adapt immutable stored schemas at the MLForm boundary instead of rewriting their identity. */
export const withSeriesColumns = <T>(schema: T): T => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return schema;
  return {
    ...schema,
    fields: schema.fields.map((field) => {
      if (!isRecord(field) || !hasPairConfig(field)) return field;
      const { field1, field2, ...config } = field;
      return {
        ...config,
        columns: [
          { ...field1, id: "field1" },
          { ...field2, id: "field2" },
        ],
        ...(field.defaultValue === undefined
          ? {}
          : { defaultValue: seriesInputValue(field, field.defaultValue) }),
      };
    }),
  };
};
