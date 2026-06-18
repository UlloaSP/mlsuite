/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isBuiltinFieldKind, isBuiltinReportKind } from "../../../app/utils/mlform/builtin-registry";

export const schemaNeedsPluginCatalog = (schema: unknown): boolean => {
  if (!schema || typeof schema !== "object") {
    return false;
  }

  const raw = schema as {
    fields?: unknown;
    reports?: unknown;
  };

  if (
    Array.isArray(raw.fields) &&
    raw.fields.some(
      (field) =>
        typeof field === "object" &&
        field !== null &&
        "kind" in field &&
        typeof (field as { kind?: unknown }).kind === "string" &&
        !isBuiltinFieldKind((field as { kind: string }).kind),
    )
  ) {
    return true;
  }

  return (
    Array.isArray(raw.reports) &&
    raw.reports.some(
      (report) =>
        typeof report === "object" &&
        report !== null &&
        "kind" in report &&
        typeof (report as { kind?: unknown }).kind === "string" &&
        !isBuiltinReportKind((report as { kind: string }).kind),
    )
  );
};
