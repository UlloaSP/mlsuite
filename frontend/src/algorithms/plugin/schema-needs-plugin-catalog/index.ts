/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isBuiltinFieldKind, isBuiltinReportKind } from "../../mlform/builtin-registry";

/**
 * schemaNeedsPluginCatalog: performs the exported transformation for this algorithm.
 *
 * Purpose: detects whether schema JSON references non-built-in plugin kinds.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
