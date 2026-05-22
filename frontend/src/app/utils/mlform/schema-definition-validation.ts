/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ExplanationConfig, FieldConfig, Registry, ReportConfig } from "mlform/runtime";
import { type CatalogFieldDefinition } from "./custom-field";
import { type CatalogExplanationDefinition } from "./custom-explanation";
import { type CatalogReportDefinition } from "./custom-report";
import type { CompatIssue } from "./shared";
import { normalizeIssuePath } from "./shared";

const pushIssue = (
  issues: CompatIssue[],
  path: Array<string | number>,
  message: string,
  severity: CompatIssue["severity"] = "error",
): void => {
  issues.push({ path, message, severity });
};

export const createCustomExplanationDefinitionMap = (
  definitions: readonly CatalogExplanationDefinition[],
): Map<string, CatalogExplanationDefinition> =>
  new Map(definitions.map((definition) => [definition.kind, definition]));

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
): void => {
  const builtinDefinition = engineRegistry.getField(field.kind);
  const customDefinition = customDefinitionMap.get(field.kind);
  const definition = builtinDefinition ?? customDefinition?.definition.definition;

  if (!definition) {
    pushIssue(issues, ["fields", index, "kind"], `Unknown field kind "${field.kind}".`);
    return;
  }

  const result = definition.schema.safeParse(field);
  if (result.success) {
    return;
  }

  for (const issue of result.error.issues) {
    pushIssue(issues, ["fields", index, ...normalizeIssuePath(issue.path)], issue.message);
  }

  if (!customDefinition) {
    return;
  }

  if (!customDefinition.active) {
    pushIssue(
      issues,
      ["fields", index, "kind"],
      `Custom field kind "${field.kind}" is inactive and will be skipped at runtime.`,
      "warning",
    );
  }
};

export const validateReportConfig = (
  report: ReportConfig,
  index: number,
  issues: CompatIssue[],
  engineRegistry: Registry,
  customDefinitionMap: Map<string, CatalogReportDefinition>,
): void => {
  const builtinDefinition = engineRegistry.getReport(report.kind);
  const customDefinition = customDefinitionMap.get(report.kind);
  const definition = builtinDefinition ?? customDefinition?.definition.definition;

  if (!definition) {
    pushIssue(issues, ["reports", index, "kind"], `Unknown report kind "${report.kind}".`);
    return;
  }

  const result = definition.schema.safeParse(report);
  if (result.success) {
    return;
  }

  for (const issue of result.error.issues) {
    pushIssue(issues, ["reports", index, ...normalizeIssuePath(issue.path)], issue.message);
  }

  if (!customDefinition) {
    return;
  }

  if (!customDefinition.active) {
    pushIssue(
      issues,
      ["reports", index, "kind"],
      `Custom report kind "${report.kind}" is inactive and will be skipped at runtime.`,
      "warning",
    );
  }
};

export const validateExplanationConfig = (
  explanation: ExplanationConfig & { id: string },
  index: number,
  issues: CompatIssue[],
  engineRegistry: Registry,
  customDefinitionMap: Map<string, CatalogExplanationDefinition>,
): void => {
  const builtinDefinition = engineRegistry.getExplanation(explanation.kind);
  const customDefinition = customDefinitionMap.get(explanation.kind);
  const definition = builtinDefinition ?? customDefinition?.definition.definition;

  if (!definition) {
    pushIssue(
      issues,
      ["explanations", index, "kind"],
      `Unknown explanation kind "${explanation.kind}".`,
    );
    return;
  }

  const result = definition.schema.safeParse(explanation);
  if (!result.success) {
    for (const issue of result.error.issues) {
      pushIssue(issues, ["explanations", index, ...normalizeIssuePath(issue.path)], issue.message);
    }
    return;
  }

  if (!customDefinition?.active) {
    if (customDefinition) {
      pushIssue(
        issues,
        ["explanations", index, "kind"],
        `Custom explanation kind "${explanation.kind}" is inactive and will be skipped at runtime.`,
        "warning",
      );
    }
  }
};
