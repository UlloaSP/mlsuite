/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormSchema, Registry } from "mlform/runtime";
import {
  createRegistry,
  toSchemaJsonSchema,
  validateSchema,
  type SchemaValidationIssue,
} from "mlform/schema";
import type { CatalogFieldDefinition } from "@/capabilities/prediction-runtime/plugins/custom-field-catalog";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-catalog";
import { getBuiltinRegistry } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import type {
  CompatIssue,
  CompatValidationResult,
} from "@/capabilities/prediction-runtime/mlform/shared";
import { hasBlockingIssues, isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

export type ValidateMlformSchemaOptions = {
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const createValidationRegistry = (options: ValidateMlformSchemaOptions): Registry => {
  const registry = createRegistry();
  const builtins = getBuiltinRegistry();
  for (const definition of builtins.listFields()) registry.registerField(definition);
  for (const definition of builtins.listReports()) registry.registerReport(definition);
  for (const item of options.customFieldDefinitions ?? []) {
    registry.registerField(item.definition.definition);
  }
  for (const item of options.customReportDefinitions ?? []) {
    registry.registerReport(item.definition.definition);
  }
  return registry;
};

const appendProductIssues = (schema: unknown, issues: CompatIssue[]): void => {
  if (!isRecord(schema)) return;
  if (Array.isArray(schema.fields)) {
    schema.fields.forEach((field, index) => {
      if (!isRecord(field)) return;
      if (typeof field.displayKey !== "string" || field.displayKey.trim().length === 0) {
        issues.push({
          path: ["fields", index, "displayKey"],
          message: `Schema field ${index + 1} is missing displayKey`,
          severity: "error",
        });
      }
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
      } else if (field.mappedTo === undefined) {
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

const toCompatIssue = (issue: SchemaValidationIssue, schema: unknown): CompatIssue => {
  let message = issue.message;
  const [section, index] = issue.path;
  if (
    issue.code === "unknown-kind" &&
    (section === "fields" || section === "reports") &&
    typeof index === "number" &&
    isRecord(schema) &&
    Array.isArray(schema[section])
  ) {
    const entry = schema[section][index];
    if (isRecord(entry) && typeof entry.kind === "string") {
      message = `Custom ${section === "fields" ? "field" : "report"} kind "${entry.kind}" does not exist in plugin catalog.`;
    }
  }
  return { path: [...issue.path], message, severity: "error" };
};

export const validateMlformSchema = (
  schema: unknown,
  options: ValidateMlformSchemaOptions = {},
): CompatValidationResult => {
  const result = validateSchema(schema, createValidationRegistry(options));
  const issues = result.issues.map((issue) => toCompatIssue(issue, schema));
  appendProductIssues(schema, issues);

  return result.success && !hasBlockingIssues(issues)
    ? { success: true, data: result.data, issues }
    : { success: false, issues };
};

export const toMlformSchema = (
  schema: unknown,
  options: ValidateMlformSchemaOptions = {},
): FormSchema => {
  const result = validateMlformSchema(schema, options);
  if (!result.success) {
    throw new Error(result.issues[0]?.message ?? "Invalid MLForm schema.");
  }
  return result.data;
};

export const createMlformJsonSchema = (options: ValidateMlformSchemaOptions = {}) =>
  toSchemaJsonSchema(createValidationRegistry(options));
