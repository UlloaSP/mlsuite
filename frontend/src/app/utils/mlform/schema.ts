import type { FieldConfig, ReportConfig } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { getBuiltinRegistry } from "./builtin-registry";
import {
  getAllowedFieldKeys,
  getAllowedReportKeys,
  mlformJsonSchema,
  SUPPORTED_TOP_LEVEL_KEYS,
} from "./builtin-json-schema";
import {
  createCustomFieldDefinitionMap,
  createCustomReportDefinitionMap,
  validateFieldConfig,
  validateReportConfig,
} from "./schema-definition-validation";
import type { CompatIssue, CompatValidationResult, JsonRecord } from "./shared";
import { getString, hasBlockingIssues, isRecord, toUniqueId } from "./shared";
import { mappedTarget, targetKey } from "./mapped-to";

export type ValidateMlformSchemaOptions = {
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const hasOwn = (value: JsonRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const pushIssue = (
  issues: CompatIssue[],
  path: Array<string | number>,
  message: string,
  severity: CompatIssue["severity"] = "error",
): void => {
  issues.push({ path, message, severity });
};

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

      const modelKey = targetKey(mappedTarget(field.mappedTo));

      return !modelKey || !(modelKey in inputs)
        ? field
        : { ...field, defaultValue: inputs[modelKey] };
    }),
  };
};

export { mlformJsonSchema };
