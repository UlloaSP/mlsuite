/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormSchema } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { isBuiltinFieldKind, isBuiltinReportKind } from "./builtin-registry";
import { mlformJsonSchema, validateMlformSchema as validateBaseMlformSchema } from "./schema";
import type { CompatIssue, CompatValidationResult } from "./shared";
import { hasBlockingIssues, isRecord } from "./shared";

type ValidateMlformSchemaOptions = {
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const makeUnknownKindIssue = (
  path: Array<string | number>,
  type: "field" | "report",
  kind: string,
): CompatIssue => ({
  path,
  message: `Custom ${type} kind "${kind}" does not exist in plugin catalog.`,
  severity: "error",
});

const appendFieldIssues = (
  schema: unknown,
  allKinds: Set<string>,
  issues: CompatIssue[],
) => {
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

const appendReportIssues = (
  schema: unknown,
  allKinds: Set<string>,
  issues: CompatIssue[],
) => {
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
  return filteredIssues;
};

export const validateMlformSchema = (
  schema: unknown,
  options: ValidateMlformSchemaOptions = {},
): CompatValidationResult => {
  const baseResult = validateBaseMlformSchema(schema, options);
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
