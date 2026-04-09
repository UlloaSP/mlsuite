/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	attachDesignSystem,
	type AttachedDesignSystem,
	type DesignSystemConfig,
} from "mlform/design-system";
import {
	type AfterSubmitContext,
	createBuiltinRegistry,
	createForm,
	type FieldConfig,
	type FormSchema,
	type FormController,
	type NormalizedFieldConfig,
	type Registry,
	type ReportConfig,
	type SubmitErrorContext,
	type SubmitRequest,
	type Transport,
} from "mlform/engine";
import { mountForm as mountPrimitiveForm, type MountedForm as MountedPrimitiveForm } from "mlform/primitives";

type JsonRecord = Record<string, unknown>;

type LegacyField = JsonRecord & {
	type?: unknown;
	title?: unknown;
	value?: unknown;
};

type LegacyReport = JsonRecord & {
	type?: unknown;
	title?: unknown;
	mapping?: unknown;
};

type CompatIssue = {
	path: Array<string | number>;
	message: string;
};

type CompatValidationResult =
	| {
		success: true;
		data: FormSchema;
	}
	| {
		success: false;
		issues: CompatIssue[];
	};

const FIELD_KIND_ALIASES: Record<string, FieldConfig["kind"]> = {
	boolean: "boolean",
	bool: "boolean",
	category: "category",
	date: "date",
	datetime: "date",
	double: "number",
	float: "number",
	int: "number",
	integer: "number",
	number: "number",
	numeric: "number",
	string: "text",
	text: "text",
};

const REPORT_KIND_ALIASES: Record<string, ReportConfig["kind"]> = {
	classifier: "classifier",
	regressor: "regressor",
};

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const slugify = (value: string): string => {
	const normalized = value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "item";
};

const toUniqueId = (
	preferred: string,
	fallback: string,
	usedIds: Set<string>,
): string => {
	const base = slugify(preferred || fallback);
	let candidate = base;
	let suffix = 2;

	while (usedIds.has(candidate)) {
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}

	usedIds.add(candidate);
	return candidate;
};

const getString = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim() ? value : undefined;

const getLegacyFieldKind = (value: unknown): FieldConfig["kind"] | null => {
	if (typeof value !== "string") {
		return null;
	}

	return FIELD_KIND_ALIASES[value.trim().toLowerCase()] ?? null;
};

const getLegacyReportKind = (value: unknown): ReportConfig["kind"] | null => {
	if (typeof value !== "string") {
		return null;
	}

	return REPORT_KIND_ALIASES[value.trim().toLowerCase()] ?? null;
};

const getBackendKey = (field: Pick<FieldConfig, "id" | "label" | "ui">): string => {
	if (isRecord(field.ui) && typeof field.ui.backendKey === "string" && field.ui.backendKey.trim()) {
		return field.ui.backendKey;
	}

	return field.label || field.id || "field";
};

const mapLegacyFieldIssuePath = (
	path: Array<string | number>,
	index: number,
): Array<string | number> => {
	const [first, ...rest] = path;

	if (first === "kind") {
		return ["inputs", index, "type", ...rest];
	}

	if (first === "label") {
		return ["inputs", index, "title", ...rest];
	}

	if (first === "defaultValue") {
		return ["inputs", index, "value", ...rest];
	}

	return ["inputs", index, ...path];
};

const normalizeIssuePath = (
	path: readonly PropertyKey[],
): Array<string | number> =>
	path.map((part) => (typeof part === "number" ? part : String(part)));

const mapLegacyReportIssuePath = (
	path: Array<string | number>,
	index: number,
): Array<string | number> => {
	const [first, ...rest] = path;

	if (first === "kind") {
		return ["outputs", index, "type", ...rest];
	}

	if (first === "label") {
		return ["outputs", index, "title", ...rest];
	}

	if (first === "labels") {
		return ["outputs", index, "mapping", ...rest];
	}

	return ["outputs", index, ...path];
};

const transformLegacyField = (
	input: LegacyField,
	index: number,
	usedIds: Set<string>,
): FieldConfig | null => {
	const kind = getLegacyFieldKind(input.type);

	if (!kind) {
		return null;
	}

	const title = getString(input.title) ?? getString(input.label) ?? `Field ${index + 1}`;
	const backendKey = title;
	const { type: _type, title: _title, value, ui, ...rest } = input;

	return {
		...rest,
		id: toUniqueId(getString(input.id) ?? backendKey, `field-${index + 1}`, usedIds),
		kind,
		label: title,
		defaultValue: value ?? input.defaultValue,
		ui: {
			...(isRecord(ui) ? ui : {}),
			backendKey,
		},
	};
};

const transformLegacyReport = (
	output: LegacyReport,
	index: number,
	usedIds: Set<string>,
): ReportConfig | null => {
	const kind = getLegacyReportKind(output.type);

	if (!kind) {
		return null;
	}

	const title =
		getString(output.title) ??
		getString(output.label) ??
		(kind === "classifier" ? "Classifier report" : "Regressor report");
	const { type: _type, title: _title, mapping, ...rest } = output;

	return {
		...rest,
		id: toUniqueId(getString(output.id) ?? title, `report-${index + 1}`, usedIds),
		kind,
		label: title,
		labels:
			kind === "classifier" && Array.isArray(mapping)
				? mapping
					.map((item) => (typeof item === "string" ? item : null))
					.filter((item): item is string => item !== null)
				: output.labels,
	};
};

const ensureTopLevelArrays = (
	schema: unknown,
	issues: CompatIssue[],
): {
	isLegacy: boolean;
	fields: unknown[] | null;
	reports: unknown[] | null;
} => {
	if (!isRecord(schema)) {
		issues.push({
			path: [],
			message: "Schema must be a JSON object.",
		});
		return { isLegacy: false, fields: null, reports: null };
	}

	const isLegacy = Array.isArray(schema.inputs) || Array.isArray(schema.outputs);
	const fieldsKey = isLegacy ? "inputs" : "fields";
	const reportsKey = isLegacy ? "outputs" : "reports";

	const fieldsValue = schema[fieldsKey];
	const reportsValue = schema[reportsKey];

	if (!Array.isArray(fieldsValue)) {
		issues.push({
			path: [fieldsKey],
			message: `${fieldsKey} must be an array.`,
		});
	}

	if (reportsValue !== undefined && !Array.isArray(reportsValue)) {
		issues.push({
			path: [reportsKey],
			message: `${reportsKey} must be an array when provided.`,
		});
	}

	return {
		isLegacy,
		fields: Array.isArray(fieldsValue) ? fieldsValue : null,
		reports: Array.isArray(reportsValue) ? reportsValue : [],
	};
};

const validateFieldConfig = (
	field: FieldConfig,
	index: number,
	issues: CompatIssue[],
	isLegacy: boolean,
	engineRegistry: Registry,
): void => {
	const definition = engineRegistry.getField(field.kind);

	if (!definition) {
		issues.push({
			path: isLegacy ? ["inputs", index, "type"] : ["fields", index, "kind"],
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
			path: isLegacy
				? mapLegacyFieldIssuePath(issuePath, index)
				: ["fields", index, ...issuePath],
			message: issue.message,
		});
	}
};

const validateReportConfig = (
	report: ReportConfig,
	index: number,
	issues: CompatIssue[],
	isLegacy: boolean,
	engineRegistry: Registry,
): void => {
	const definition = engineRegistry.getReport(report.kind);

	if (!definition) {
		issues.push({
			path: isLegacy ? ["outputs", index, "type"] : ["reports", index, "kind"],
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
			path: isLegacy
				? mapLegacyReportIssuePath(issuePath, index)
				: ["reports", index, ...issuePath],
			message: issue.message,
		});
	}
};

export const validateMlformSchema = (schema: unknown): CompatValidationResult => {
	const issues: CompatIssue[] = [];
	const engineRegistry = createBuiltinRegistry();
	const { isLegacy, fields, reports } = ensureTopLevelArrays(schema, issues);

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
				path: [isLegacy ? "inputs" : "fields", index],
				message: "Field definition must be an object.",
			});
			return;
		}

		if (isLegacy) {
			const transformed = transformLegacyField(field, index, usedFieldIds);
			if (!transformed) {
				issues.push({
					path: ["inputs", index, "type"],
					message: `Unsupported field type "${String(field.type ?? "")}".`,
				});
				return;
			}
			validateFieldConfig(transformed, index, issues, true, engineRegistry);
			nextFields.push(transformed);
			return;
		}

		const label = getString(field.label) ?? getString(field.title) ?? `Field ${index + 1}`;
		const id =
			getString(field.id) ?? toUniqueId(label, `field-${index + 1}`, usedFieldIds);
		const nextField: FieldConfig = {
			...field,
			id,
			kind: String(field.kind),
			label,
			ui: {
				...(isRecord(field.ui) ? field.ui : {}),
				backendKey: getString(field.id) ?? label,
			},
		};

		validateFieldConfig(nextField, index, issues, false, engineRegistry);
		nextFields.push(nextField);
	});

	reports.forEach((report, index) => {
		if (!isRecord(report)) {
			issues.push({
				path: [isLegacy ? "outputs" : "reports", index],
				message: "Report definition must be an object.",
			});
			return;
		}

		if (isLegacy) {
			const transformed = transformLegacyReport(report, index, usedReportIds);
			if (!transformed) {
				issues.push({
					path: ["outputs", index, "type"],
					message: `Unsupported report type "${String(report.type ?? "")}".`,
				});
				return;
			}
			validateReportConfig(transformed, index, issues, true, engineRegistry);
			nextReports.push(transformed);
			return;
		}

		const label =
			getString(report.label) ??
			getString(report.title) ??
			`Report ${index + 1}`;
		const nextReport: ReportConfig = {
			...report,
			id: getString(report.id) ?? toUniqueId(label, `report-${index + 1}`, usedReportIds),
			kind: String(report.kind),
			label,
		};

		validateReportConfig(nextReport, index, issues, false, engineRegistry);
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

const toAnalyzerPayload = (
	serializedValues: Record<string, unknown>,
	fields: readonly Pick<NormalizedFieldConfig, "id" | "label" | "ui">[],
): Record<string, unknown> =>
	Object.fromEntries(
		fields
			.filter((field) => field.id in serializedValues)
			.map((field) => [getBackendKey(field), serializedValues[field.id]]),
	);

const parseResponse = async (response: Response): Promise<unknown> => {
	const contentType = response.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		return response.json();
	}

	const text = await response.text();

	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

const createPredictionTransport = (
	modelId: string,
	fields: readonly NormalizedFieldConfig[],
): Transport => ({
	async submit(request: SubmitRequest) {
		const payload = toAnalyzerPayload(request.serializedValues, fields);
		const formData = new FormData();
		formData.set(
			"data",
			new File([JSON.stringify(payload)], "data.json", {
				type: "application/json",
			}),
		);

		const response = await fetch(
			`${import.meta.env.VITE_BACKEND_URL}/api/analyzer/predict/by-id?modelId=${modelId}`,
			{
				method: "POST",
				body: formData,
				credentials: "include",
			},
		);

		const parsed = await parseResponse(response);

		if (!response.ok) {
			const message =
				isRecord(parsed) && typeof parsed.message === "string"
					? parsed.message
					: response.statusText || "Prediction request failed.";
			throw new Error(message);
		}

		return parsed;
	},
});

type MountPredictionFormOptions = {
	container: HTMLElement;
	schema: unknown;
	modelId: string;
	theme: "light" | "dark";
	onSubmit?: (inputs: Record<string, unknown>, response: Record<string, unknown>) => void;
	onSubmitError?: (error: unknown) => void;
};

export type MountedPredictionForm = {
	readonly form: FormController;
	readonly host: HTMLElement;
	updateTheme: (theme: "light" | "dark") => void;
	unmount: () => void;
};

type ComponentOverrides = NonNullable<
	NonNullable<DesignSystemConfig["overrides"]>["components"]
>;

const darkPredictionComponents: ComponentOverrides = {
	field: {
		tokens: {
			"--mlf-field-bg":
				"linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.92))",
			"--mlf-field-border": "rgba(148, 163, 184, 0.18)",
			"--mlf-field-shadow": "0 10px 28px rgba(2, 6, 23, 0.24)",
			"--mlf-field-shadow-hover": "0 16px 38px rgba(2, 6, 23, 0.3)",
			"--mlf-field-label-color": "#e2e8f0",
			"--mlf-field-description-color": "#94a3b8",
			"--mlf-field-feedback-success": "#34d399",
			"--mlf-field-feedback-error": "#f87171",
			"--mlf-help-btn-bg": "rgba(148, 163, 184, 0.22)",
			"--mlf-help-btn-bg-hover": "rgba(148, 163, 184, 0.32)",
			"--mlf-help-btn-bg-disabled": "rgba(71, 85, 105, 0.75)",
			"--mlf-help-btn-color": "#e2e8f0",
		},
	},
	report: {
		tokens: {
			"--mlf-report-bg":
				"linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.88))",
			"--mlf-report-border": "rgba(148, 163, 184, 0.18)",
			"--mlf-report-shadow": "0 12px 30px rgba(2, 6, 23, 0.24)",
			"--mlf-report-label-color": "#94a3b8",
			"--mlf-report-description-color": "#e2e8f0",
			"--mlf-report-meta-bg": "rgba(139, 92, 246, 0.16)",
			"--mlf-report-meta-color": "#c4b5fd",
			"--mlf-report-empty-bg": "rgba(139, 92, 246, 0.1)",
			"--mlf-report-empty-color": "#cbd5e1",
			"--mlf-report-hero-bg":
				"linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(59, 130, 246, 0.1))",
			"--mlf-report-error-bg": "rgba(239, 68, 68, 0.14)",
			"--mlf-report-error-color": "#fca5a5",
		},
	},
	input: {
		tokens: {
			"--mlf-input-bg": "rgba(51, 65, 85, 0.92)",
			"--mlf-input-bg-disabled": "rgba(30, 41, 59, 0.82)",
			"--mlf-input-border": "rgba(148, 163, 184, 0.22)",
			"--mlf-input-border-focus": "#8b5cf6",
			"--mlf-input-text": "#f8fafc",
			"--mlf-input-placeholder": "#94a3b8",
			"--mlf-input-shadow-focus": "0 0 0 4px rgba(139, 92, 246, 0.2)",
		},
	},
	submit: {
		tokens: {
			"--mlf-submit-bg": "linear-gradient(135deg, #8b5cf6, #6366f1)",
			"--mlf-submit-bg-hover": "linear-gradient(135deg, #7c3aed, #4f46e5)",
			"--mlf-submit-color": "#f8fafc",
			"--mlf-submit-shadow": "0 16px 36px rgba(99, 102, 241, 0.28)",
			"--mlf-submit-shadow-hover": "0 20px 42px rgba(99, 102, 241, 0.34)",
			"--mlf-submit-focus-ring": "0 0 0 4px rgba(139, 92, 246, 0.18)",
		},
	},
	error: {
		tokens: {
			"--mlf-error-bg": "rgba(127, 29, 29, 0.24)",
			"--mlf-error-border": "rgba(248, 113, 113, 0.28)",
			"--mlf-error-color": "#fecaca",
		},
	},
	status: {
		tokens: {
			"--mlf-status-bg": "rgba(148, 163, 184, 0.12)",
			"--mlf-status-color": "#cbd5e1",
		},
	},
	chart: {
		tokens: {
			"--mlf-chart-track-bg": "rgba(148, 163, 184, 0.16)",
			"--mlf-chart-fill-bg": "linear-gradient(90deg, #8b5cf6, #38bdf8)",
		},
	},
};

const lightPredictionComponents: ComponentOverrides = {
	field: {
		tokens: {
			"--mlf-field-bg":
				"linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98))",
			"--mlf-field-border": "rgba(148, 163, 184, 0.18)",
			"--mlf-field-shadow": "0 10px 28px rgba(148, 163, 184, 0.14)",
			"--mlf-field-shadow-hover": "0 16px 36px rgba(148, 163, 184, 0.18)",
			"--mlf-field-label-color": "#0f172a",
			"--mlf-field-description-color": "#475569",
			"--mlf-help-btn-bg": "rgba(99, 102, 241, 0.12)",
			"--mlf-help-btn-bg-hover": "rgba(99, 102, 241, 0.2)",
			"--mlf-help-btn-bg-disabled": "rgba(148, 163, 184, 0.45)",
			"--mlf-help-btn-color": "#4338ca",
		},
	},
	report: {
		tokens: {
			"--mlf-report-bg":
				"linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.96))",
			"--mlf-report-border": "rgba(148, 163, 184, 0.16)",
			"--mlf-report-shadow": "0 12px 30px rgba(148, 163, 184, 0.14)",
			"--mlf-report-label-color": "#475569",
			"--mlf-report-description-color": "#0f172a",
			"--mlf-report-meta-bg": "rgba(79, 70, 229, 0.1)",
			"--mlf-report-meta-color": "#4338ca",
			"--mlf-report-empty-bg": "rgba(79, 70, 229, 0.06)",
			"--mlf-report-empty-color": "#475569",
		},
	},
	input: {
		tokens: {
			"--mlf-input-bg": "rgba(255, 255, 255, 0.98)",
			"--mlf-input-bg-disabled": "rgba(241, 245, 249, 0.95)",
			"--mlf-input-border": "rgba(148, 163, 184, 0.22)",
			"--mlf-input-border-focus": "#4f46e5",
			"--mlf-input-text": "#0f172a",
			"--mlf-input-placeholder": "#64748b",
			"--mlf-input-shadow-focus": "0 0 0 4px rgba(79, 70, 229, 0.12)",
		},
	},
	submit: {
		tokens: {
			"--mlf-submit-bg": "linear-gradient(135deg, #6366f1, #2563eb)",
			"--mlf-submit-bg-hover": "linear-gradient(135deg, #4f46e5, #1d4ed8)",
			"--mlf-submit-color": "#ffffff",
			"--mlf-submit-shadow": "0 16px 36px rgba(79, 70, 229, 0.18)",
			"--mlf-submit-shadow-hover": "0 20px 40px rgba(79, 70, 229, 0.22)",
			"--mlf-submit-focus-ring": "0 0 0 4px rgba(79, 70, 229, 0.12)",
		},
	},
	error: {
		tokens: {
			"--mlf-error-bg": "rgba(254, 226, 226, 0.9)",
			"--mlf-error-border": "rgba(248, 113, 113, 0.26)",
			"--mlf-error-color": "#b91c1c",
		},
	},
	status: {
		tokens: {
			"--mlf-status-bg": "rgba(79, 70, 229, 0.08)",
			"--mlf-status-color": "#4338ca",
		},
	},
	chart: {
		tokens: {
			"--mlf-chart-track-bg": "rgba(148, 163, 184, 0.14)",
			"--mlf-chart-fill-bg": "linear-gradient(90deg, #6366f1, #2563eb)",
		},
	},
};

const createPredictionDesignSystem = (theme: "light" | "dark"): DesignSystemConfig => ({
	mode: theme,
	theme: theme === "dark" ? "graphite" : "cobalt",
	recipe: theme === "dark" ? "contrast" : "soft",
	overrides: {
		density: "comfortable" as const,
		tokens: theme === "dark"
			? {
				"--mlf-font-family-body":
					'"IBM Plex Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
				"--mlf-font-family-heading":
					'"Sora", "IBM Plex Sans", "Segoe UI", sans-serif',
				"--mlf-shell-bg": "transparent",
				"--mlf-panel-bg": "rgba(15, 23, 42, 0.76)",
				"--mlf-panel-header-bg": "rgba(15, 23, 42, 0.88)",
				"--mlf-panel-footer-bg": "rgba(2, 6, 23, 0.72)",
				"--mlf-panel-border": "rgba(148, 163, 184, 0.18)",
				"--mlf-color-accent": "#8b5cf6",
				"--mlf-color-accent-hover": "#7c3aed",
				"--mlf-color-accent-soft": "rgba(139, 92, 246, 0.18)",
				"--mlf-color-text": "#e5eefb",
				"--mlf-color-text-muted": "#94a3b8",
				"--mlf-color-surface": "rgba(15, 23, 42, 0.92)",
				"--mlf-color-surface-elevated": "rgba(30, 41, 59, 0.92)",
				"--mlf-color-surface-muted": "rgba(30, 41, 59, 0.65)",
				"--mlf-color-border": "rgba(148, 163, 184, 0.18)",
				"--mlf-color-border-strong": "rgba(148, 163, 184, 0.34)",
				"--mlf-color-focus-ring": "rgba(139, 92, 246, 0.24)",
				"--mlf-shadow-md": "0 18px 50px rgba(2, 6, 23, 0.36)",
				"--mlf-shadow-lg": "0 26px 70px rgba(2, 6, 23, 0.42)",
				"--mlf-pane-min-width": "19rem",
			}
			: {
				"--mlf-font-family-body":
					'"IBM Plex Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
				"--mlf-font-family-heading":
					'"Sora", "IBM Plex Sans", "Segoe UI", sans-serif',
				"--mlf-shell-bg": "transparent",
				"--mlf-panel-bg": "rgba(255, 255, 255, 0.84)",
				"--mlf-panel-header-bg": "rgba(255, 255, 255, 0.9)",
				"--mlf-panel-footer-bg": "rgba(248, 250, 252, 0.82)",
				"--mlf-panel-border": "rgba(148, 163, 184, 0.16)",
				"--mlf-color-accent": "#4f46e5",
				"--mlf-color-accent-hover": "#4338ca",
				"--mlf-color-accent-soft": "rgba(79, 70, 229, 0.12)",
				"--mlf-color-text": "#0f172a",
				"--mlf-color-text-muted": "#475569",
				"--mlf-color-surface": "rgba(255, 255, 255, 0.94)",
				"--mlf-color-surface-elevated": "rgba(255, 255, 255, 0.98)",
				"--mlf-color-surface-muted": "rgba(241, 245, 249, 0.9)",
				"--mlf-color-border": "rgba(148, 163, 184, 0.18)",
				"--mlf-color-border-strong": "rgba(100, 116, 139, 0.28)",
				"--mlf-color-focus-ring": "rgba(79, 70, 229, 0.18)",
				"--mlf-shadow-md": "0 20px 55px rgba(148, 163, 184, 0.18)",
				"--mlf-shadow-lg": "0 28px 70px rgba(148, 163, 184, 0.2)",
				"--mlf-pane-min-width": "19rem",
			},
		components: theme === "dark" ? darkPredictionComponents : lightPredictionComponents,
	},
});

export const mountPredictionForm = ({
	container,
	schema,
	modelId,
	theme,
	onSubmit,
	onSubmitError,
}: MountPredictionFormOptions): MountedPredictionForm => {
	const formSchema = toMlformSchema(schema);
	const normalizedFields = formSchema.fields as NormalizedFieldConfig[];
	const form = createForm({
		schema: formSchema,
		registry: createBuiltinRegistry(),
		transport: createPredictionTransport(modelId, normalizedFields),
		hooks: {
			afterSubmit({ result }: AfterSubmitContext) {
				onSubmit?.(
					toAnalyzerPayload(result.serializedValues, normalizedFields),
					isRecord(result.raw) ? result.raw : { raw: result.raw },
				);
			},
			onSubmitError({ error }: SubmitErrorContext) {
				onSubmitError?.(error);
			},
		},
	});

	const primitiveMounted: MountedPrimitiveForm = mountPrimitiveForm(container, form, {
		layout: "split",
		reportPane: "always",
		formLabel: "Signature Inputs",
		reportsLabel: "Prediction Output",
		submitLabel: "Run Prediction",
		validatingLabel: "Checking signature...",
		submittingLabel: "Running model...",
	});
	const designSystem: AttachedDesignSystem = attachDesignSystem(primitiveMounted.host, {
		config: createPredictionDesignSystem(theme),
	});

	return {
		form,
		host: primitiveMounted.host,
		updateTheme(nextTheme) {
			designSystem.replace(createPredictionDesignSystem(nextTheme));
		},
		unmount() {
			form.abortSubmit("unmount");
			designSystem.disconnect();
			primitiveMounted.unmount();
		},
	};
};

export const applyPredictionInputsToSchema = (
	schema: unknown,
	inputs: Record<string, unknown>,
): unknown => {
	if (!isRecord(schema)) {
		return schema;
	}

	if (Array.isArray(schema.inputs)) {
		return {
			...schema,
			inputs: schema.inputs.map((field) => {
				if (!isRecord(field)) {
					return field;
				}

				const backendKey = getString(field.title) ?? getString(field.label);
				if (!backendKey || !(backendKey in inputs)) {
					return field;
				}

				return {
					...field,
					value: inputs[backendKey],
				};
			}),
		};
	}

	if (Array.isArray(schema.fields)) {
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
	}

	return schema;
};

export const mlformJsonSchema = {
	type: "object",
	additionalProperties: false,
	required: ["inputs"],
	properties: {
		inputs: {
			type: "array",
			items: {
				oneOf: [
					{
						type: "object",
						required: ["type", "title"],
						additionalProperties: true,
						properties: {
							type: { enum: ["text", "string"] },
							title: { type: "string" },
							required: { type: "boolean" },
							value: { type: ["string", "number", "boolean", "null"] },
							placeholder: { type: "string" },
							minLength: { type: "integer", minimum: 0 },
							maxLength: { type: "integer", minimum: 0 },
							pattern: { type: "string" },
						},
					},
					{
						type: "object",
						required: ["type", "title"],
						additionalProperties: true,
						properties: {
							type: { enum: ["number", "numeric", "int", "integer", "float", "double"] },
							title: { type: "string" },
							required: { type: "boolean" },
							value: { type: ["number", "null"] },
							min: { type: "number" },
							max: { type: "number" },
							step: { type: "number", exclusiveMinimum: 0 },
							unit: { type: "string" },
						},
					},
					{
						type: "object",
						required: ["type", "title"],
						additionalProperties: true,
						properties: {
							type: { enum: ["boolean", "bool"] },
							title: { type: "string" },
							required: { type: "boolean" },
							value: { type: "boolean" },
						},
					},
					{
						type: "object",
						required: ["type", "title", "options"],
						additionalProperties: true,
						properties: {
							type: { enum: ["category"] },
							title: { type: "string" },
							required: { type: "boolean" },
							value: { type: ["string", "null"] },
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
						required: ["type", "title"],
						additionalProperties: true,
						properties: {
							type: { enum: ["date", "datetime"] },
							title: { type: "string" },
							required: { type: "boolean" },
							value: { type: ["string", "null"] },
							min: { type: "string" },
							max: { type: "string" },
						},
					},
				],
			},
		},
		outputs: {
			type: "array",
			items: {
				oneOf: [
					{
						type: "object",
						required: ["type"],
						additionalProperties: true,
						properties: {
							type: { enum: ["classifier"] },
							title: { type: "string" },
							mapping: {
								type: "array",
								items: { type: "string" },
							},
							details: { type: "boolean" },
						},
					},
					{
						type: "object",
						required: ["type"],
						additionalProperties: true,
						properties: {
							type: { enum: ["regressor"] },
							title: { type: "string" },
							precision: { type: "integer", minimum: 0 },
							unit: { type: "string" },
						},
					},
				],
			},
		},
	},
} as const;
