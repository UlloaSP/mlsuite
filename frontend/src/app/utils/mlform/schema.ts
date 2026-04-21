/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	createBuiltinRegistry,
	type ExplanationConfig,
	type FieldConfig,
	type FormSchema,
	type NormalizedFieldConfig,
	type NormalizedReportConfig,
	type Registry,
	type ReportConfig,
} from "mlform/engine";
import {
	CUSTOM_FIELD_COMPONENT,
	type CatalogFieldDefinition,
} from "./custom-field";
import {
	type CatalogExplanationDefinition,
} from "./custom-explanation";
import {
	CUSTOM_REPORT_COMPONENT,
	type CatalogReportDefinition,
} from "./custom-report";
import {
	type CompatIssue,
	type CompatValidationResult,
	type JsonRecord,
	getString,
	hasBlockingIssues,
	isRecord,
	normalizeIssuePath,
	toUniqueId,
} from "./shared";

export type ValidateMlformSchemaOptions = {
	customFieldDefinitions?: readonly CatalogFieldDefinition[];
	customReportDefinitions?: readonly CatalogReportDefinition[];
	customExplanationDefinitions?: readonly CatalogExplanationDefinition[];
};

const SUPPORTED_TOP_LEVEL_KEYS = ["fields", "reports", "explanations"] as const;

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
	classifier: ["kind", ...SHARED_REPORT_KEYS, "labels", "details"],
	regressor: ["kind", ...SHARED_REPORT_KEYS, "precision", "unit"],
} as const satisfies Record<string, readonly string[]>;

const ALL_FIELD_KEYS = [...new Set(Object.values(FIELD_KEYS_BY_KIND).flat())];
const ALL_REPORT_KEYS = [...new Set(Object.values(REPORT_KEYS_BY_KIND).flat())];
const BUILTIN_FIELD_KINDS = Object.keys(FIELD_KEYS_BY_KIND);
const BUILTIN_REPORT_KINDS = Object.keys(REPORT_KEYS_BY_KIND);
const idleFieldState = {
	value: undefined,
	initialValue: undefined,
	touched: false,
	dirty: false,
	valid: true,
	visible: true,
	disabled: false,
	readOnly: false,
	errors: [] as string[],
	status: "idle",
} as const;
const idleReportState = {
	payload: undefined,
	error: null,
	status: "idle",
} as const;

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
		{
			type: "object",
			required: ["kind", "label"],
			additionalProperties: true,
			properties: {
				kind: {
					type: "string",
					minLength: 1,
					not: { enum: BUILTIN_FIELD_KINDS },
				},
				...sharedFieldProperties,
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
			},
		},
		{
			type: "object",
			required: ["kind"],
			additionalProperties: true,
			properties: {
				kind: {
					type: "string",
					minLength: 1,
					not: { enum: BUILTIN_REPORT_KINDS },
				},
				...sharedReportProperties,
			},
		},
	],
} as const;

const explanationSchema = {
	type: "object",
	required: ["kind"],
	additionalProperties: true,
	properties: {
		id: { type: "string" },
		kind: { type: "string", minLength: 1 },
		label: { type: "string", minLength: 1 },
		description: { type: "string" },
	},
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
		explanations: {
			type: "array",
			default: [],
			items: explanationSchema,
		},
	},
} as const;

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
			pushIssue(
				issues,
				[...path, key],
				`Property "${key}" is not supported by current mlform.`,
			);
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
			pushIssue(
				issues,
				duplicatePath,
				`Duplicate explicit id "${normalized}" in schema.`,
			);
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

const getModernExplanationKind = (value: JsonRecord): string | null =>
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

const createCustomExplanationDefinitionMap = (
	definitions: readonly CatalogExplanationDefinition[],
): Map<string, CatalogExplanationDefinition> =>
	new Map(definitions.map((definition) => [definition.kind, definition]));

const createCustomFieldDefinitionMap = (
	definitions: readonly CatalogFieldDefinition[],
): Map<string, CatalogFieldDefinition> =>
	new Map(definitions.map((definition) => [definition.kind, definition]));

const createCustomReportDefinitionMap = (
	definitions: readonly CatalogReportDefinition[],
): Map<string, CatalogReportDefinition> =>
	new Map(definitions.map((definition) => [definition.kind, definition]));

const ensureTopLevelArrays = (
	schema: unknown,
	issues: CompatIssue[],
): {
	fields: unknown[] | null;
	reports: unknown[] | null;
	explanations: unknown[] | null;
} => {
	if (!isRecord(schema)) {
		pushIssue(issues, [], "Schema must be a JSON object.");
		return { fields: null, reports: null, explanations: null };
	}

	pushUnsupportedKeys(schema, SUPPORTED_TOP_LEVEL_KEYS, [], issues);

	if (!hasOwn(schema, "fields")) {
		pushIssue(issues, [], 'Schema must define "fields".');
		return { fields: null, reports: null, explanations: null };
	}

	const fieldsValue = schema.fields;
	const reportsValue = schema.reports;
	const explanationsValue = schema.explanations;

	if (!Array.isArray(fieldsValue)) {
		pushIssue(issues, ["fields"], "fields must be an array.");
	}

	if (reportsValue !== undefined && !Array.isArray(reportsValue)) {
		pushIssue(issues, ["reports"], "reports must be an array when provided.");
	}

	if (explanationsValue !== undefined && !Array.isArray(explanationsValue)) {
		pushIssue(issues, ["explanations"], "explanations must be an array when provided.");
	}

	return {
		fields: Array.isArray(fieldsValue) ? fieldsValue : null,
		reports: Array.isArray(reportsValue) ? reportsValue : [],
		explanations: Array.isArray(explanationsValue) ? explanationsValue : [],
	};
};

const validateFieldConfig = (
	field: FieldConfig,
	index: number,
	issues: CompatIssue[],
	engineRegistry: Registry,
	customDefinitionMap: Map<string, CatalogFieldDefinition>,
): void => {
	const builtinDefinition = engineRegistry.getField(field.kind);
	const customDefinition = customDefinitionMap.get(field.kind);
	const definition = builtinDefinition ?? customDefinition?.definition;

	if (!definition) {
		pushIssue(issues, ["fields", index, "kind"], `Unknown field kind "${field.kind}".`);
		return;
	}

	const result = definition.schema.safeParse(field);
	if (result.success) {
		return;
	}

	for (const issue of result.error.issues) {
		pushIssue(
			issues,
			["fields", index, ...normalizeIssuePath(issue.path)],
			issue.message,
		);
	}

	if (customDefinition) {
		const descriptor = customDefinition.definition.describe(
			result.data as unknown as NormalizedFieldConfig,
			{
				fieldId: field.id ?? `field-${index + 1}`,
				state: idleFieldState,
			},
		);

		if (descriptor.component !== CUSTOM_FIELD_COMPONENT) {
			pushIssue(
				issues,
				["fields", index, "kind"],
				`Custom field kind "${field.kind}" must use shared renderer "${CUSTOM_FIELD_COMPONENT}".`,
			);
		}

		if (!customDefinition.active) {
			pushIssue(
				issues,
				["fields", index, "kind"],
				`Custom field kind "${field.kind}" is inactive and will be skipped at runtime.`,
				"warning",
			);
		}
	}
};

const validateReportConfig = (
	report: ReportConfig,
	index: number,
	issues: CompatIssue[],
	engineRegistry: Registry,
	customDefinitionMap: Map<string, CatalogReportDefinition>,
): void => {
	const builtinDefinition = engineRegistry.getReport(report.kind);
	const customDefinition = customDefinitionMap.get(report.kind);
	const definition = builtinDefinition ?? customDefinition?.definition;

	if (!definition) {
		pushIssue(issues, ["reports", index, "kind"], `Unknown report kind "${report.kind}".`);
		return;
	}

	const result = definition.schema.safeParse(report);
	if (result.success) {
		return;
	}

	for (const issue of result.error.issues) {
		pushIssue(
			issues,
			["reports", index, ...normalizeIssuePath(issue.path)],
			issue.message,
		);
	}

	if (customDefinition) {
		const descriptor = customDefinition.definition.describe(
			result.data as unknown as NormalizedReportConfig,
			{
				reportId: report.id ?? `report-${index + 1}`,
				state: idleReportState,
				payload: undefined,
				result: null,
			},
		);

		if (descriptor !== null && descriptor.component !== CUSTOM_REPORT_COMPONENT) {
			pushIssue(
				issues,
				["reports", index, "kind"],
				`Custom report kind "${report.kind}" must use shared renderer "${CUSTOM_REPORT_COMPONENT}".`,
			);
		}

		if (!customDefinition.active) {
			pushIssue(
				issues,
				["reports", index, "kind"],
				`Custom report kind "${report.kind}" is inactive and will be skipped at runtime.`,
				"warning",
			);
		}
	}
};

const validateExplanationConfig = (
	explanation: ExplanationConfig & { id: string },
	index: number,
	issues: CompatIssue[],
	engineRegistry: Registry,
	customDefinitionMap: Map<string, CatalogExplanationDefinition>,
): void => {
	const builtinDefinition = engineRegistry.getExplanation(explanation.kind);
	const customDefinition = customDefinitionMap.get(explanation.kind);
	const definition = builtinDefinition ?? customDefinition?.definition;

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
			pushIssue(
				issues,
				["explanations", index, ...normalizeIssuePath(issue.path)],
				issue.message,
			);
		}
		return;
	}

	if (customDefinition) {
		if (!customDefinition.active) {
			pushIssue(
				issues,
				["explanations", index, "kind"],
				`Custom explanation kind "${explanation.kind}" is inactive and will be skipped at runtime.`,
				"warning",
			);
		}
	}
};

export const validateMlformSchema = (
	schema: unknown,
	options: ValidateMlformSchemaOptions = {},
): CompatValidationResult => {
	const issues: CompatIssue[] = [];
	const engineRegistry = createBuiltinRegistry();
	const customFieldDefinitionMap = createCustomFieldDefinitionMap(
		options.customFieldDefinitions ?? [],
	);
	const customReportDefinitionMap = createCustomReportDefinitionMap(
		options.customReportDefinitions ?? [],
	);
	const customDefinitionMap = createCustomExplanationDefinitionMap(
		options.customExplanationDefinitions ?? [],
	);
	const { fields, reports, explanations } = ensureTopLevelArrays(schema, issues);

	if (!fields || !reports || !explanations || hasBlockingIssues(issues)) {
		return {
			success: false,
			issues,
		};
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

		const kind = getModernFieldKind(field);
		if (!kind || !customFieldDefinitionMap.has(kind)) {
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
			ui: {
				...(isRecord(field.ui) ? field.ui : {}),
				backendKey:
					(isRecord(field.ui) && typeof field.ui.backendKey === "string"
						? field.ui.backendKey
						: undefined) ?? getString(field.label) ?? getString(field.id) ?? id,
			},
		};

		validateFieldConfig(nextField, index, issues, engineRegistry, customFieldDefinitionMap);
		nextFields.push(nextField);
	});

	reports.forEach((report, index) => {
		if (!isRecord(report)) {
			pushIssue(issues, ["reports", index], "Report definition must be an object.");
			return;
		}

		const kind = getModernReportKind(report);
		if (!kind || !customReportDefinitionMap.has(kind)) {
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
			source: getString(report.source) ?? id,
		};

		validateReportConfig(nextReport, index, issues, engineRegistry, customReportDefinitionMap);
		nextReports.push(nextReport);
	});

	explanations.forEach((explanation, index) => {
		if (!isRecord(explanation)) {
			pushIssue(
				issues,
				["explanations", index],
				"Explanation definition must be an object.",
			);
			return;
		}

		const kind = getModernExplanationKind(explanation);
		if (!kind) {
			pushIssue(
				issues,
				["explanations", index, "kind"],
				'Explanation definition must define string "kind".',
			);
			return;
		}

		const label = getString(explanation.label) ?? kind;
		const id = createSchemaId(
			getString(explanation.id),
			label,
			`explanation-${index + 1}`,
			usedExplanationIds,
			["explanations", index, "id"],
			issues,
		);
		const nextExplanation: ExplanationConfig = {
			...explanation,
			id,
			kind,
			label: getString(explanation.label),
			description: getString(explanation.description),
		};

		validateExplanationConfig(
			{
				...nextExplanation,
				id,
			},
			index,
			issues,
			engineRegistry,
			customDefinitionMap,
		);
		nextExplanations.push(nextExplanation);
	});

	if (hasBlockingIssues(issues)) {
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
	const engineRegistry = createBuiltinRegistry();
	const activeFieldKinds = new Set(
		customFieldDefinitions.filter((definition) => definition.active).map((definition) => definition.kind),
	);
	const activeReportKinds = new Set(
		customReportDefinitions.filter((definition) => definition.active).map((definition) => definition.kind),
	);
	const activeKinds = new Set(
		customExplanationDefinitions
			.filter((definition) => definition.active)
			.map((definition) => definition.kind),
	);

	return {
		...schema,
		fields: schema.fields.filter((field) =>
			engineRegistry.getField(field.kind) !== undefined || activeFieldKinds.has(field.kind),
		),
		reports: (schema.reports ?? []).filter((report) =>
			engineRegistry.getReport(report.kind) !== undefined || activeReportKinds.has(report.kind),
		),
		explanations: (schema.explanations ?? []).filter((explanation) =>
			engineRegistry.getExplanation(explanation.kind) !== undefined || activeKinds.has(explanation.kind),
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
