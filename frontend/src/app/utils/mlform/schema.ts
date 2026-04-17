/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	createBuiltinRegistry,
	type FieldConfig,
	type FormSchema,
	type Registry,
	type ReportConfig,
} from "mlform/engine";
import {
	type CompatIssue,
	type CompatValidationResult,
	type JsonRecord,
	getString,
	hasExplanationsEnabled,
	isRecord,
	normalizeIssuePath,
	toUniqueId,
} from "./shared";

const SUPPORTED_TOP_LEVEL_KEYS = ["fields", "reports"] as const;

const SHARED_FIELD_KEYS = [
	"id",
	"label",
	"description",
	"required",
	"disabled",
	"hidden",
	"readOnly",
	"disabledWhen",
	"hiddenWhen",
	"readOnlyWhen",
	"asyncValidationDebounceMs",
	"inactiveFieldPolicy",
	"valuePath",
	"defaultValue",
	"ui",
] as const;

const SHARED_REPORT_KEYS = [
	"id",
	"label",
	"description",
	"source",
	"ui",
] as const;

const FIELD_KEYS_BY_KIND = {
	text: ["kind", ...SHARED_FIELD_KEYS, "placeholder", "minLength", "maxLength", "pattern"],
	number: ["kind", ...SHARED_FIELD_KEYS, "min", "max", "step", "unit", "placeholder"],
	boolean: ["kind", ...SHARED_FIELD_KEYS, "trueLabel", "falseLabel"],
	category: ["kind", ...SHARED_FIELD_KEYS, "options"],
	date: ["kind", ...SHARED_FIELD_KEYS, "min", "max", "step"],
	"time-series": [
		"kind",
		...SHARED_FIELD_KEYS,
		"minPoints",
		"maxPoints",
		"granularity",
		"ordered",
		"uniqueTimestamps",
		"minDate",
		"maxDate",
		"minValue",
		"maxValue",
		"unit",
	],
} as const satisfies Record<string, readonly string[]>;

const REPORT_KEYS_BY_KIND = {
	classifier: ["kind", ...SHARED_REPORT_KEYS, "labels", "details", "explanations"],
	regressor: ["kind", ...SHARED_REPORT_KEYS, "precision", "unit", "explanations"],
} as const satisfies Record<string, readonly string[]>;

const ALL_FIELD_KEYS = [...new Set(Object.values(FIELD_KEYS_BY_KIND).flat())];
const ALL_REPORT_KEYS = [...new Set(Object.values(REPORT_KEYS_BY_KIND).flat())];

const uiSchema = {
	type: "object",
	additionalProperties: true,
} as const;

const valuePathSchema = {
	oneOf: [
		{ type: "string", minLength: 1 },
		{
			type: "array",
			minItems: 1,
			items: {
				type: "string",
				minLength: 1,
			},
		},
	],
} as const;

const declarativeConditionSchema = {
	type: "object",
} as const;

const sharedFieldProperties = {
	id: { type: "string" },
	label: { type: "string", minLength: 1 },
	description: { type: "string" },
	required: { type: "boolean" },
	disabled: { type: "boolean" },
	hidden: { type: "boolean" },
	readOnly: { type: "boolean" },
	disabledWhen: declarativeConditionSchema,
	hiddenWhen: declarativeConditionSchema,
	readOnlyWhen: declarativeConditionSchema,
	asyncValidationDebounceMs: { type: "integer", minimum: 0 },
	inactiveFieldPolicy: { enum: ["include", "omit", "reset-on-hide"] },
	valuePath: valuePathSchema,
	defaultValue: {},
	ui: uiSchema,
} as const;

const sharedReportProperties = {
	id: { type: "string" },
	label: { type: "string" },
	description: { type: "string" },
	source: { type: "string" },
	ui: uiSchema,
} as const;

const fieldSchema = {
	oneOf: [
		{
			type: "object",
			required: ["kind", "label"],
			additionalProperties: false,
			properties: {
				kind: { const: "text" },
				...sharedFieldProperties,
				placeholder: { type: "string" },
				minLength: { type: "integer", minimum: 0 },
				maxLength: { type: "integer", minimum: 0 },
				pattern: { type: "string" },
			},
		},
		{
			type: "object",
			required: ["kind", "label"],
			additionalProperties: false,
			properties: {
				kind: { const: "number" },
				...sharedFieldProperties,
				min: { type: "number" },
				max: { type: "number" },
				step: { type: "number", exclusiveMinimum: 0 },
				unit: { type: "string" },
				placeholder: { type: "string" },
			},
		},
		{
			type: "object",
			required: ["kind", "label"],
			additionalProperties: false,
			properties: {
				kind: { const: "boolean" },
				...sharedFieldProperties,
				trueLabel: { type: "string" },
				falseLabel: { type: "string" },
			},
		},
		{
			type: "object",
			required: ["kind", "label", "options"],
			additionalProperties: false,
			properties: {
				kind: { const: "category" },
				...sharedFieldProperties,
				options: {
					type: "array",
					minItems: 1,
					items: {
						oneOf: [
							{ type: "string" },
							{
								type: "object",
								required: ["label", "value"],
								additionalProperties: false,
								properties: {
									label: { type: "string" },
									value: { type: "string" },
								},
							},
						],
					},
				},
			},
		},
		{
			type: "object",
			required: ["kind", "label"],
			additionalProperties: false,
			properties: {
				kind: { const: "date" },
				...sharedFieldProperties,
				min: { type: "string" },
				max: { type: "string" },
				step: { type: "number", exclusiveMinimum: 0 },
			},
		},
		{
			type: "object",
			required: ["kind", "label"],
			additionalProperties: false,
			properties: {
				kind: { const: "time-series" },
				...sharedFieldProperties,
				minPoints: { type: "integer", minimum: 0 },
				maxPoints: { type: "integer", minimum: 0 },
				granularity: { enum: ["date", "datetime"] },
				ordered: { enum: ["asc", "desc", false] },
				uniqueTimestamps: { type: "boolean" },
				minDate: { type: "string" },
				maxDate: { type: "string" },
				minValue: { type: "number" },
				maxValue: { type: "number" },
				unit: { type: "string" },
			},
		},
	],
} as const;

const reportSchema = {
	oneOf: [
		{
			type: "object",
			required: ["kind"],
			additionalProperties: false,
			properties: {
				kind: { const: "classifier" },
				...sharedReportProperties,
				labels: {
					type: "array",
					items: { type: "string" },
				},
				details: { type: "boolean" },
				explanations: { type: "boolean" },
			},
		},
		{
			type: "object",
			required: ["kind"],
			additionalProperties: false,
			properties: {
				kind: { const: "regressor" },
				...sharedReportProperties,
				precision: { type: "integer", minimum: 0 },
				unit: { type: "string" },
				explanations: { type: "boolean" },
			},
		},
	],
} as const;

export const mlformJsonSchema = {
	type: "object",
	required: ["fields"],
	additionalProperties: false,
	properties: {
		fields: {
			type: "array",
			items: fieldSchema,
		},
		reports: {
			type: "array",
			items: reportSchema,
		},
	},
} as const;

const hasOwn = (value: JsonRecord, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(value, key);

const pushUnsupportedKeys = (
	value: JsonRecord,
	allowedKeys: readonly string[],
	path: Array<string | number>,
	issues: CompatIssue[],
): void => {
	const allowed = new Set(allowedKeys);

	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) {
			issues.push({
				path: [...path, key],
				message: `Property "${key}" is not supported by current mlform.`,
			});
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
	if (explicitId) {
		const normalized = explicitId.trim();

		if (usedIds.has(normalized)) {
			issues.push({
				path: duplicatePath,
				message: `Duplicate explicit id "${normalized}" in schema.`,
			});
			return toUniqueId(fallbackLabel, fallbackPrefix, usedIds);
		}

		usedIds.add(normalized);
		return normalized;
	}

	return toUniqueId(fallbackLabel, fallbackPrefix, usedIds);
};

const getModernFieldKind = (value: JsonRecord): FieldConfig["kind"] | null =>
	typeof value.kind === "string" ? value.kind : null;

const getModernReportKind = (value: JsonRecord): ReportConfig["kind"] | null =>
	typeof value.kind === "string" ? value.kind : null;

const getAllowedFieldKeys = (kind: FieldConfig["kind"] | null): readonly string[] => {
	if (kind && kind in FIELD_KEYS_BY_KIND) {
		return FIELD_KEYS_BY_KIND[kind as keyof typeof FIELD_KEYS_BY_KIND];
	}

	return ALL_FIELD_KEYS;
};

const getAllowedReportKeys = (kind: ReportConfig["kind"] | null): readonly string[] => {
	if (kind && kind in REPORT_KEYS_BY_KIND) {
		return REPORT_KEYS_BY_KIND[kind as keyof typeof REPORT_KEYS_BY_KIND];
	}

	return ALL_REPORT_KEYS;
};

const ensureTopLevelArrays = (
	schema: unknown,
	issues: CompatIssue[],
): {
	fields: unknown[] | null;
	reports: unknown[] | null;
} => {
	if (!isRecord(schema)) {
		issues.push({
			path: [],
			message: "Schema must be a JSON object.",
		});
		return { fields: null, reports: null };
	}

	pushUnsupportedKeys(schema, SUPPORTED_TOP_LEVEL_KEYS, [], issues);

	if (!hasOwn(schema, "fields")) {
		issues.push({
			path: [],
			message: 'Schema must define "fields".',
		});
		return { fields: null, reports: null };
	}

	const fieldsValue = schema.fields;
	const reportsValue = schema.reports;

	if (!Array.isArray(fieldsValue)) {
		issues.push({
			path: ["fields"],
			message: "fields must be an array.",
		});
	}

	if (reportsValue !== undefined && !Array.isArray(reportsValue)) {
		issues.push({
			path: ["reports"],
			message: "reports must be an array when provided.",
		});
	}

	return {
		fields: Array.isArray(fieldsValue) ? fieldsValue : null,
		reports: Array.isArray(reportsValue) ? reportsValue : [],
	};
};

const validateFieldConfig = (
	field: FieldConfig,
	index: number,
	issues: CompatIssue[],
	engineRegistry: Registry,
): void => {
	const definition = engineRegistry.getField(field.kind);

	if (!definition) {
		issues.push({
			path: ["fields", index, "kind"],
			message: `Unknown field kind "${field.kind}".`,
		});
		return;
	}

	const result = definition.schema.safeParse(field);
	if (result.success) {
		return;
	}

	for (const issue of result.error.issues) {
		const issuePath = normalizeIssuePath(issue.path);
		issues.push({
			path: ["fields", index, ...issuePath],
			message: issue.message,
		});
	}
};

const validateReportConfig = (
	report: ReportConfig,
	index: number,
	issues: CompatIssue[],
	engineRegistry: Registry,
): void => {
	const definition = engineRegistry.getReport(report.kind);

	if (!definition) {
		issues.push({
			path: ["reports", index, "kind"],
			message: `Unknown report kind "${report.kind}".`,
		});
		return;
	}

	const result = definition.schema.safeParse(report);
	if (result.success) {
		return;
	}

	for (const issue of result.error.issues) {
		const issuePath = normalizeIssuePath(issue.path);
		issues.push({
			path: ["reports", index, ...issuePath],
			message: issue.message,
		});
	}
};

export const validateMlformSchema = (schema: unknown): CompatValidationResult => {
	const issues: CompatIssue[] = [];
	const engineRegistry = createBuiltinRegistry();
	const { fields, reports } = ensureTopLevelArrays(schema, issues);

	if (!fields || !reports || issues.length > 0) {
		return {
			success: false,
			issues,
		};
	}

	const usedFieldIds = new Set<string>();
	const usedReportIds = new Set<string>();
	const nextFields: FieldConfig[] = [];
	const nextReports: ReportConfig[] = [];

	fields.forEach((field, index) => {
		if (!isRecord(field)) {
			issues.push({
				path: ["fields", index],
				message: "Field definition must be an object.",
			});
			return;
		}

		const kind = getModernFieldKind(field);
		pushUnsupportedKeys(field, getAllowedFieldKeys(kind), ["fields", index], issues);

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
			ui: {
				...(isRecord(field.ui) ? field.ui : {}),
				backendKey:
					(isRecord(field.ui) && typeof field.ui.backendKey === "string"
						? field.ui.backendKey
						: undefined) ?? getString(field.label) ?? getString(field.id) ?? id,
			},
		};

		validateFieldConfig(nextField, index, issues, engineRegistry);
		nextFields.push(nextField);
	});

	reports.forEach((report, index) => {
		if (!isRecord(report)) {
			issues.push({
				path: ["reports", index],
				message: "Report definition must be an object.",
			});
			return;
		}

		const kind = getModernReportKind(report);
		pushUnsupportedKeys(report, getAllowedReportKeys(kind), ["reports", index], issues);

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
			source: getString(report.source) ?? id,
		};

		validateReportConfig(nextReport, index, issues, engineRegistry);
		nextReports.push(nextReport);
	});

	if (issues.length > 0) {
		return {
			success: false,
			issues,
		};
	}

	return {
		success: true,
		data: {
			fields: nextFields,
			reports: nextReports,
		},
	};
};

export const toMlformSchema = (schema: unknown): FormSchema => {
	const result = validateMlformSchema(schema);

	if (!result.success) {
		const firstIssue = result.issues[0];
		throw new Error(firstIssue?.message ?? "Invalid MLForm schema.");
	}

	return result.data;
};

export const ensureExplanationReportInSchema = (schema: unknown): unknown => {
	if (!isRecord(schema) || !Array.isArray(schema.fields)) {
		return schema;
	}

	const reports = Array.isArray(schema.reports) ? schema.reports : [];
	if (hasExplanationsEnabled(reports)) {
		return schema;
	}

	const explanationReportIndex = reports.findIndex(
		(report) =>
			isRecord(report) &&
			(report.kind === "classifier" || report.kind === "regressor"),
	);

	if (explanationReportIndex < 0) {
		return schema;
	}

	return {
		...schema,
		reports: reports.map((report, index) =>
			index === explanationReportIndex && isRecord(report)
				? {
					...report,
					explanations: true,
				}
				: report,
		),
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
				(isRecord(field.ui) && typeof field.ui.backendKey === "string"
					? field.ui.backendKey
					: undefined) ??
				getString(field.label) ??
				getString(field.id);

			if (!backendKey || !(backendKey in inputs)) {
				return field;
			}

			return {
				...field,
				defaultValue: inputs[backendKey],
			};
		}),
	};
};
