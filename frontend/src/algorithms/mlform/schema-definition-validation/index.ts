/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConfig, Registry, ReportConfig } from "mlform/runtime";
import { type CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import { type CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import type { CompatIssue } from "../../../algorithms/mlform/shared";
import { normalizeIssuePath } from "../../../algorithms/mlform/shared";

const pushIssue = (
  issues: CompatIssue[],
  path: Array<string | number>,
  message: string,
  severity: CompatIssue["severity"] = "error",
): void => {
  issues.push({ path, message, severity });
};

export const createCustomFieldDefinitionMap = (
  definitions: readonly CatalogFieldDefinition[],
): Map<string, CatalogFieldDefinition> =>
  new Map(definitions.map((definition) => [definition.kind, definition]));

export const createCustomReportDefinitionMap = (
  definitions: readonly CatalogReportDefinition[],
): Map<string, CatalogReportDefinition> =>
  new Map(definitions.map((definition) => [definition.kind, definition]));

export const validateFieldConfig = (
  field: FieldConfig,
  index: number,
  issues: CompatIssue[],
  engineRegistry: Registry,
  customDefinitionMap: Map<string, CatalogFieldDefinition>,
): FieldConfig | null => {
  const builtinDefinition = engineRegistry.getField(field.kind);
  const customDefinition = customDefinitionMap.get(field.kind);
  const definition = builtinDefinition ?? customDefinition?.definition.definition;

  if (!definition) {
    pushIssue(issues, ["fields", index, "kind"], `Unknown field kind "${field.kind}".`);
    return null;
  }

  const result = definition.schema.safeParse(field);
  if (result.success) {
    return { ...field, ...result.data, id: field.id, label: field.label };
  }

  for (const issue of result.error.issues) {
    pushIssue(issues, ["fields", index, ...normalizeIssuePath(issue.path)], issue.message);
  }
  return null;
};

export const validateReportConfig = (
  report: ReportConfig,
  index: number,
  issues: CompatIssue[],
  engineRegistry: Registry,
  customDefinitionMap: Map<string, CatalogReportDefinition>,
): ReportConfig | null => {
  const builtinDefinition = engineRegistry.getReport(report.kind);
  const customDefinition = customDefinitionMap.get(report.kind);
  const definition = builtinDefinition ?? customDefinition?.definition.definition;

  if (!definition) {
    pushIssue(issues, ["reports", index, "kind"], `Unknown report kind "${report.kind}".`);
    return null;
  }

  const result = definition.schema.safeParse(report);
  if (result.success) {
    return { ...report, ...result.data, id: report.id, label: report.label };
  }

  for (const issue of result.error.issues) {
    pushIssue(issues, ["reports", index, ...normalizeIssuePath(issue.path)], issue.message);
  }
  return null;
};
