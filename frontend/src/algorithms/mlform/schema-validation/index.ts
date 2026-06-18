/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormSchema } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../plugin/custom-field-catalog";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import { isBuiltinFieldKind, isBuiltinReportKind } from "../builtin-registry";
import { mlformJsonSchema, validateMlformSchema as validateBaseMlformSchema } from "../../../algorithms/mlform/schema-compat";
import { toMlformRuntimeSchema } from "../schema-runtime-adapter";
import type { CompatIssue, CompatValidationResult } from "../../../algorithms/mlform/shared";
import { hasBlockingIssues, isRecord } from "../../../algorithms/mlform/shared";

type ValidateMlformSchemaOptions = {
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

/** makeUnknownKindIssue: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const makeUnknownKindIssue = (
  path: Array<string | number>,
  type: "field" | "report",
  kind: string,
): CompatIssue => ({
  path,
  message: `Custom ${type} kind "${kind}" does not exist in plugin catalog.`,
  severity: "error",
});

/** appendFieldIssues: internal transformation helper for MLForm compatibility and runtime adaptation. @remarks Args: schema, allKinds, issues; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const appendFieldIssues = (schema: unknown, allKinds: Set<string>, issues: CompatIssue[]) => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) {
    return;
  }
  schema.fields.forEach((field, index) => {
    if (!isRecord(field) || typeof field.kind !== "string" || isBuiltinFieldKind(field.kind)) {
      return;
    }
    if (!allKinds.has(field.kind)) {
      issues.push(makeUnknownKindIssue(["fields", index, "kind"], "field", field.kind));
    }
  });
};

/** appendReportIssues: internal transformation helper for MLForm compatibility and runtime adaptation. @remarks Args: schema, allKinds, issues; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const appendReportIssues = (schema: unknown, allKinds: Set<string>, issues: CompatIssue[]) => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) {
    return;
  }
  schema.reports.forEach((report, index) => {
    if (!isRecord(report) || typeof report.kind !== "string" || isBuiltinReportKind(report.kind)) {
      return;
    }
    if (!allKinds.has(report.kind)) {
      issues.push(makeUnknownKindIssue(["reports", index, "kind"], "report", report.kind));
    }
  });
};

/** appendMappedToIssues: internal transformation helper for MLForm compatibility and runtime adaptation. @remarks Args: schema, issues; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const appendMappedToIssues = (schema: unknown, issues: CompatIssue[]) => {
  if (!isRecord(schema)) return;
  if (Array.isArray(schema.fields)) {
    schema.fields.forEach((field, index) => {
      if (!isRecord(field)) return;
      if (field.kind === "onehot-category" && Array.isArray(field.options)) {
        field.options.forEach((option, optionIndex) => {
          if (isRecord(option) && option.mappedTo === undefined) {
            issues.push({
              path: ["fields", index, "options", optionIndex, "mappedTo"],
              message: `Schema field ${index + 1} option ${optionIndex + 1} falta mappedTo`,
              severity: "error",
            });
          }
        });
        return;
      }
      if (field.mappedTo === undefined) {
        issues.push({
          path: ["fields", index, "mappedTo"],
          message: `Schema field ${index + 1} falta mappedTo`,
          severity: "error",
        });
      }
    });
  }
  if (Array.isArray(schema.reports)) {
    schema.reports.forEach((report, index) => {
      if (isRecord(report) && report.mappedTo === undefined) {
        issues.push({
          path: ["reports", index, "mappedTo"],
          message: `Schema report ${index + 1} falta mappedTo`,
          severity: "error",
        });
      }
    });
  }
};

/** mergeIssues: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const mergeIssues = (
  schema: unknown,
  baseIssues: readonly CompatIssue[],
  options: ValidateMlformSchemaOptions,
): CompatIssue[] => {
  const filteredIssues = baseIssues.filter((issue) => {
    const [section, index, property] = issue.path;
    if (property !== "kind" || typeof index !== "number" || !isRecord(schema)) {
      return true;
    }
    if (section === "fields" && Array.isArray(schema.fields)) {
      const field = schema.fields[index];
      return !isRecord(field) || typeof field.kind !== "string" || isBuiltinFieldKind(field.kind);
    }
    if (section === "reports" && Array.isArray(schema.reports)) {
      const report = schema.reports[index];
      return (
        !isRecord(report) || typeof report.kind !== "string" || isBuiltinReportKind(report.kind)
      );
    }
    return true;
  });
  const allFieldKinds = new Set<string>();
  for (const definition of options.customFieldDefinitions ?? []) {
    allFieldKinds.add(definition.kind);
  }
  const allReportKinds = new Set<string>();
  for (const definition of options.customReportDefinitions ?? []) {
    allReportKinds.add(definition.kind);
  }
  appendFieldIssues(schema, allFieldKinds, filteredIssues);
  appendReportIssues(schema, allReportKinds, filteredIssues);
  appendMappedToIssues(schema, filteredIssues);
  return filteredIssues;
};

/**
 * validateMlformSchema: validates runtime/config data and returns normalized result or raises an error
 *
 * Purpose: validates and normalizes MLForm schema input before editor/runtime use.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const validateMlformSchema = (
  schema: unknown,
  options: ValidateMlformSchemaOptions = {},
): CompatValidationResult => {
  const runtimeSchema = toMlformRuntimeSchema(schema);
  const baseResult = validateBaseMlformSchema(runtimeSchema, options);
  const issues = mergeIssues(schema, baseResult.issues, options);
  if (!baseResult.success) {
    return { success: false, issues };
  }
  if (hasBlockingIssues(issues)) {
    return { success: false, issues };
  }
  return {
    success: true,
    data: baseResult.data,
    issues,
  };
};

/**
 * toMlformSchema: converts data into another contract shape
 *
 * Purpose: validates and normalizes MLForm schema input before editor/runtime use.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toMlformSchema = (
  schema: unknown,
  options: ValidateMlformSchemaOptions = {},
): FormSchema => {
  const result = validateMlformSchema(schema, options);
  if (!result.success) {
    const firstIssue =
      result.issues.find((issue) => issue.severity === "error") ?? result.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid MLForm schema.");
  }
  return result.data;
};

export { mlformJsonSchema };
