/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ExplanationConfig, FieldConfig, FormSchema, ReportConfig } from "mlform/runtime";
import type { CatalogFieldDefinition } from "./custom-field";
import type { CatalogExplanationDefinition } from "./custom-explanation";
import type { CatalogReportDefinition } from "./custom-report";
import { getBuiltinRegistry, isBuiltinFieldKind, isBuiltinReportKind } from "./builtin-registry";
import { getAllowedFieldKeys, getAllowedReportKeys, mlformJsonSchema, SUPPORTED_TOP_LEVEL_KEYS } from "./builtin-json-schema";
import {
	createCustomExplanationDefinitionMap,
	createCustomFieldDefinitionMap,
	createCustomReportDefinitionMap,
	validateExplanationConfig,
	validateFieldConfig,
	validateReportConfig,
} from "./schema-definition-validation";
import type { CompatIssue, CompatValidationResult, JsonRecord } from "./shared";
import { getString, hasBlockingIssues, isRecord, toUniqueId } from "./shared";

export type ValidateMlformSchemaOptions = {
	customFieldDefinitions?: readonly CatalogFieldDefinition[];
	customReportDefinitions?: readonly CatalogReportDefinition[];
	customExplanationDefinitions?: readonly CatalogExplanationDefinition[];
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
): { fields: unknown[] | null; reports: unknown[] | null; explanations: unknown[] | null } => {
	if (!isRecord(schema)) {
		pushIssue(issues, [], "Schema must be a JSON object.");
		return { fields: null, reports: null, explanations: null };
	}

	pushUnsupportedKeys(schema, SUPPORTED_TOP_LEVEL_KEYS, [], issues);

	if (!hasOwn(schema, "fields")) {
		pushIssue(issues, [], 'Schema must define "fields".');
		return { fields: null, reports: null, explanations: null };
	}

	if (!Array.isArray(schema.fields)) {
		pushIssue(issues, ["fields"], "fields must be an array.");
	}

	if (schema.reports !== undefined && !Array.isArray(schema.reports)) {
		pushIssue(issues, ["reports"], "reports must be an array when provided.");
	}

	if (schema.explanations !== undefined && !Array.isArray(schema.explanations)) {
		pushIssue(issues, ["explanations"], "explanations must be an array when provided.");
	}

	return {
		fields: Array.isArray(schema.fields) ? schema.fields : null,
		reports: Array.isArray(schema.reports) ? schema.reports : [],
		explanations: Array.isArray(schema.explanations) ? schema.explanations : [],
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
	const explanationDefinitions = createCustomExplanationDefinitionMap(
		options.customExplanationDefinitions ?? [],
	);
	const { fields, reports, explanations } = ensureTopLevelArrays(schema, issues);

	if (!fields || !reports || !explanations || hasBlockingIssues(issues)) {
		return { success: false, issues };
	}

	const usedFieldIds = new Set<string>();
	const usedReportIds = new Set<string>();
	const usedExplanationIds = new Set<string>();
	const nextFields: FieldConfig[] = [];
	const nextReports: ReportConfig[] = [];
	const nextExplanations: ExplanationConfig[] = [];

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
		const id = createSchemaId(getString(field.id), label, `field-${index + 1}`, usedFieldIds, ["fields", index, "id"], issues);
		const nextField: FieldConfig = {
			...field,
			id,
			kind: String(field.kind),
			label,
			ui: {
				...(isRecord(field.ui) ? field.ui : {}),
				backendKey:
					(isRecord(field.ui) && typeof field.ui.backendKey === "string" ? field.ui.backendKey : undefined) ??
					getString(field.label) ??
					getString(field.id) ??
					id,
			},
		};

		validateFieldConfig(nextField, index, issues, engineRegistry, fieldDefinitions);
		nextFields.push(nextField);
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
		const id = createSchemaId(getString(report.id), label, `report-${index + 1}`, usedReportIds, ["reports", index, "id"], issues);
		const nextReport: ReportConfig = {
			...report,
			id,
			kind: String(report.kind),
			label,
			source: getString(report.source) ?? id,
		};

		validateReportConfig(nextReport, index, issues, engineRegistry, reportDefinitions);
		nextReports.push(nextReport);
	});

	explanations.forEach((explanation, index) => {
		if (!isRecord(explanation)) {
			pushIssue(issues, ["explanations", index], "Explanation definition must be an object.");
			return;
		}

		const kind = typeof explanation.kind === "string" ? explanation.kind : null;
		if (!kind) {
			pushIssue(issues, ["explanations", index, "kind"], 'Explanation definition must define string "kind".');
			return;
		}

		const label = getString(explanation.label) ?? kind;
		const id = createSchemaId(getString(explanation.id), label, `explanation-${index + 1}`, usedExplanationIds, ["explanations", index, "id"], issues);
		const nextExplanation: ExplanationConfig = {
			...explanation,
			id,
			kind,
			label: getString(explanation.label),
			description: getString(explanation.description),
		};

		validateExplanationConfig({ ...nextExplanation, id }, index, issues, engineRegistry, explanationDefinitions);
		nextExplanations.push(nextExplanation);
	});

	if (hasBlockingIssues(issues)) {
		return { success: false, issues };
	}

	return {
		success: true,
		data: {
			fields: nextFields,
			reports: nextReports,
			explanations: nextExplanations,
		},
		issues: issues.filter((issue) => issue.severity === "warning"),
	};
};

export const toMlformSchema = (
	schema: unknown,
	options: ValidateMlformSchemaOptions = {},
): FormSchema => {
	const result = validateMlformSchema(schema, options);

	if (!result.success) {
		const firstIssue = result.issues.find((issue) => issue.severity === "error") ?? result.issues[0];
		throw new Error(firstIssue?.message ?? "Invalid MLForm schema.");
	}

	return result.data;
};

export const filterInactiveCustomDefinitionsFromSchema = (
	schema: FormSchema,
	customFieldDefinitions: readonly CatalogFieldDefinition[] = [],
	customReportDefinitions: readonly CatalogReportDefinition[] = [],
	customExplanationDefinitions: readonly CatalogExplanationDefinition[] = [],
): FormSchema => {
	const activeFieldKinds = new Set(customFieldDefinitions.filter((definition) => definition.active).map((definition) => definition.kind));
	const activeReportKinds = new Set(customReportDefinitions.filter((definition) => definition.active).map((definition) => definition.kind));
	const activeExplanationKinds = new Set(customExplanationDefinitions.filter((definition) => definition.active).map((definition) => definition.kind));

	return {
		...schema,
		fields: schema.fields.filter((field: FieldConfig) => isBuiltinFieldKind(field.kind) || activeFieldKinds.has(field.kind)),
		reports: (schema.reports ?? []).filter((report: ReportConfig) => isBuiltinReportKind(report.kind) || activeReportKinds.has(report.kind)),
		explanations: (schema.explanations ?? []).filter((explanation: ExplanationConfig) => engineRegistry.getExplanation(explanation.kind) !== undefined || activeExplanationKinds.has(explanation.kind)),
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

			const backendKey =
				(isRecord(field.ui) && typeof field.ui.backendKey === "string" ? field.ui.backendKey : undefined) ??
				getString(field.label) ??
				getString(field.id);

			return !backendKey || !(backendKey in inputs)
				? field
				: { ...field, defaultValue: inputs[backendKey] };
		}),
	};
};

const engineRegistry = getBuiltinRegistry();

export { mlformJsonSchema };
