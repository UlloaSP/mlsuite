import type { FieldConfig, ReportConfig } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../plugin/custom-field-catalog";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import { getBuiltinRegistry } from "../builtin-registry";
import {
  getAllowedFieldKeys,
  getAllowedReportKeys,
  mlformJsonSchema,
  SUPPORTED_TOP_LEVEL_KEYS,
} from "../../../algorithms/mlform/builtin-json-schema";
import {
  createCustomFieldDefinitionMap,
  createCustomReportDefinitionMap,
  validateFieldConfig,
  validateReportConfig,
} from "../schema-definition-validation";
import type {
  CompatIssue,
  CompatValidationResult,
  JsonRecord,
} from "../../../algorithms/mlform/shared";
import {
  getString,
  hasBlockingIssues,
  isRecord,
  toUniqueId,
} from "../../../algorithms/mlform/shared";

/**
 * ValidateMlformSchemaOptions: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: validates and adapts persisted MLForm schema data for runtime compatibility.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type ValidateMlformSchemaOptions = {
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

/** hasOwn: internal predicate for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const hasOwn = (value: JsonRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/** pushIssue: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const pushIssue = (
  issues: CompatIssue[],
  path: Array<string | number>,
  message: string,
  severity: CompatIssue["severity"] = "error",
): void => {
  issues.push({ path, message, severity });
};

/** pushUnsupportedKeys: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const pushUnsupportedKeys = (
  value: JsonRecord,
  allowedKeys: readonly string[],
  path: Array<string | number>,
  issues: CompatIssue[],
): void => {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      pushIssue(issues, [...path, key], `Property "${key}" is not supported by current mlform.`);
    }
  }
};

/** createSchemaId: internal transformation helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const createSchemaId = (
  explicitId: string | undefined,
  fallbackLabel: string,
  fallbackPrefix: string,
  usedIds: Set<string>,
  duplicatePath: Array<string | number>,
  issues: CompatIssue[],
): string => {
  if (!explicitId) {
    return toUniqueId(fallbackLabel, fallbackPrefix, usedIds);
  }

  const normalized = explicitId.trim();
  if (usedIds.has(normalized)) {
    pushIssue(issues, duplicatePath, `Duplicate explicit id "${normalized}" in schema.`);
    return toUniqueId(fallbackLabel, fallbackPrefix, usedIds);
  }

  usedIds.add(normalized);
  return normalized;
};

/** ensureTopLevelArrays: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const ensureTopLevelArrays = (
  schema: unknown,
  issues: CompatIssue[],
): { fields: unknown[] | null; reports: unknown[] | null } => {
  if (!isRecord(schema)) {
    pushIssue(issues, [], "Schema must be a JSON object.");
    return { fields: null, reports: null };
  }

  pushUnsupportedKeys(schema, SUPPORTED_TOP_LEVEL_KEYS, [], issues);

  if (!hasOwn(schema, "fields")) {
    pushIssue(issues, [], 'Schema must define "fields".');
    return { fields: null, reports: null };
  }

  if (!Array.isArray(schema.fields)) {
    pushIssue(issues, ["fields"], "fields must be an array.");
  }

  if (schema.reports !== undefined && !Array.isArray(schema.reports)) {
    pushIssue(issues, ["reports"], "reports must be an array when provided.");
  }

  return {
    fields: Array.isArray(schema.fields) ? schema.fields : null,
    reports: Array.isArray(schema.reports) ? schema.reports : [],
  };
};

/**
 * validateMlformSchema: validates runtime/config data and returns normalized result or raises an error
 *
 * Purpose: validates and adapts persisted MLForm schema data for runtime compatibility.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const validateMlformSchema = (
  schema: unknown,
  options: ValidateMlformSchemaOptions = {},
): CompatValidationResult => {
  const issues: CompatIssue[] = [];
  const engineRegistry = getBuiltinRegistry();
  const fieldDefinitions = createCustomFieldDefinitionMap(options.customFieldDefinitions ?? []);
  const reportDefinitions = createCustomReportDefinitionMap(options.customReportDefinitions ?? []);
  const { fields, reports } = ensureTopLevelArrays(schema, issues);

  if (!fields || !reports || hasBlockingIssues(issues)) {
    return { success: false, issues };
  }

  const usedFieldIds = new Set<string>();
  const usedReportIds = new Set<string>();
  const nextFields: FieldConfig[] = [];
  const nextReports: ReportConfig[] = [];

  fields.forEach((field, index) => {
    if (!isRecord(field)) {
      pushIssue(issues, ["fields", index], "Field definition must be an object.");
      return;
    }

    const kind = typeof field.kind === "string" ? field.kind : null;
    if (!kind || !fieldDefinitions.has(kind)) {
      pushUnsupportedKeys(field, getAllowedFieldKeys(kind), ["fields", index], issues);
    }

    const label = getString(field.label) ?? `Field ${index + 1}`;
    const id = createSchemaId(
      getString(field.id),
      label,
      `field-${index + 1}`,
      usedFieldIds,
      ["fields", index, "id"],
      issues,
    );
    const nextField: FieldConfig = {
      ...field,
      id,
      kind: String(field.kind),
      label,
    };

    if (getString(nextField.displayKey) === undefined) {
      pushIssue(issues, ["fields", index, "displayKey"], `Field "${id}" must define displayKey.`);
    }

    nextFields.push(
      validateFieldConfig(nextField, index, issues, engineRegistry, fieldDefinitions) ?? nextField,
    );
  });

  reports.forEach((report, index) => {
    if (!isRecord(report)) {
      pushIssue(issues, ["reports", index], "Report definition must be an object.");
      return;
    }

    const kind = typeof report.kind === "string" ? report.kind : null;
    if (!kind || !reportDefinitions.has(kind)) {
      pushUnsupportedKeys(report, getAllowedReportKeys(kind), ["reports", index], issues);
    }

    const label = getString(report.label) ?? `Report ${index + 1}`;
    const id = createSchemaId(
      getString(report.id),
      label,
      `report-${index + 1}`,
      usedReportIds,
      ["reports", index, "id"],
      issues,
    );
    const nextReport: ReportConfig = {
      ...report,
      id,
      kind: String(report.kind),
      label,
    };

    nextReports.push(
      validateReportConfig(nextReport, index, issues, engineRegistry, reportDefinitions) ??
        nextReport,
    );
  });

  if (hasBlockingIssues(issues)) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: {
      fields: nextFields,
      reports: nextReports,
    },
    issues: issues.filter((issue) => issue.severity === "warning"),
  };
};

/**
 * applyPredictionInputsToSchema: applies a deterministic transformation to the supplied data
 *
 * Purpose: validates and adapts persisted MLForm schema data for runtime compatibility.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const applyPredictionInputsToSchema = (
  schema: unknown,
  inputs: Record<string, unknown>,
): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) {
    return schema;
  }

  return {
    ...schema,
    fields: schema.fields.map((field) => {
      if (!isRecord(field)) {
        return field;
      }

      const displayKey =
        getString(field.displayKey) ?? getString(field.id) ?? getString(field.label);

      return !displayKey || !(displayKey in inputs)
        ? field
        : { ...field, defaultValue: inputs[displayKey] };
    }),
  };
};

export { mlformJsonSchema };
