/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConfig, Registry, ReportConfig } from "mlform/runtime";
import { type CatalogFieldDefinition } from "../../plugin/custom-field-catalog";
import { type CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import type { CompatIssue } from "../../../algorithms/mlform/shared";
import { normalizeIssuePath } from "../../../algorithms/mlform/shared";

/** pushIssue: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const pushIssue = (
  issues: CompatIssue[],
  path: Array<string | number>,
  message: string,
  severity: CompatIssue["severity"] = "error",
): void => {
  issues.push({ path, message, severity });
};

const schemaRunKeys = ["mappedTo", "displayKey", "source"] as const;

const preserveSchemaRunConfig = <T extends FieldConfig | ReportConfig>(
  parsed: unknown,
  source: T,
): T => {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return source;
  const next = {
    ...source,
    ...(parsed as Record<string, unknown>),
    id: source.id,
    label: source.label,
  };
  schemaRunKeys.forEach((key) => {
    if ((source as Record<string, unknown>)[key] !== undefined) {
      next[key] = (source as Record<string, unknown>)[key];
    }
  });
  if (Array.isArray((source as Record<string, unknown>).options)) {
    next.options = (source as Record<string, unknown>).options;
  }
  return next as T;
};

/**
 * createCustomFieldDefinitionMap: creates a configured runtime object or schema object
 *
 * Purpose: validates field/report configs against built-in and custom MLForm definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const createCustomFieldDefinitionMap = (
  definitions: readonly CatalogFieldDefinition[],
): Map<string, CatalogFieldDefinition> =>
  new Map(definitions.map((definition) => [definition.kind, definition]));

/**
 * createCustomReportDefinitionMap: creates a configured runtime object or schema object
 *
 * Purpose: validates field/report configs against built-in and custom MLForm definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const createCustomReportDefinitionMap = (
  definitions: readonly CatalogReportDefinition[],
): Map<string, CatalogReportDefinition> =>
  new Map(definitions.map((definition) => [definition.kind, definition]));

/**
 * validateFieldConfig: validates runtime/config data and returns normalized result or raises an error
 *
 * Purpose: validates field/report configs against built-in and custom MLForm definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
    return preserveSchemaRunConfig(result.data, field);
  }

  for (const issue of result.error.issues) {
    pushIssue(issues, ["fields", index, ...normalizeIssuePath(issue.path)], issue.message);
  }
  return null;
};

/**
 * validateReportConfig: validates runtime/config data and returns normalized result or raises an error
 *
 * Purpose: validates field/report configs against built-in and custom MLForm definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
    return preserveSchemaRunConfig(result.data, report);
  }

  for (const issue of result.error.issues) {
    pushIssue(issues, ["reports", index, ...normalizeIssuePath(issue.path)], issue.message);
  }
  return null;
};
