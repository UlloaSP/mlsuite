/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "../../../api/schemas/dtos";

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * shortSchemaId: returns a compact stable identifier for schema UI rows.
 */
export const shortSchemaId = (id: string | number | null | undefined): string => {
  const value = String(id ?? "");
  return value.length > 10 ? value.slice(0, 10) : value || "-";
};

/**
 * formatSchemaDate: formats backend timestamps without changing persisted values.
 */
export const formatSchemaDate = (value: string | null | undefined): string => {
  if (!value) return "unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatter.format(date);
};

/**
 * countSchemaReports: counts report records in a persisted schema snapshot.
 */
export const countSchemaReports = (schema: JsonRecord | undefined): number =>
  Array.isArray(schema?.reports) ? schema.reports.length : 0;
