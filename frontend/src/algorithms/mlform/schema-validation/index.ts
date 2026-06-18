/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormSchema } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { isBuiltinFieldKind, isBuiltinReportKind } from "../../../app/utils/mlform/builtin-registry";
import { mlformJsonSchema, validateMlformSchema as validateBaseMlformSchema } from "../../../algorithms/mlform/schema-compat";
import { toMlformRuntimeSchema } from "../schema-runtime-adapter";
import type { CompatIssue, CompatValidationResult } from "../../../algorithms/mlform/shared";
import { hasBlockingIssues, isRecord } from "../../../algorithms/mlform/shared";

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
