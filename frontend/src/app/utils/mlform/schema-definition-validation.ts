/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ExplanationConfig, FieldConfig, NormalizedFieldConfig, NormalizedReportConfig, Registry, ReportConfig } from "mlform/engine";
import { CUSTOM_FIELD_COMPONENT, type CatalogFieldDefinition } from "./custom-field";
import { type CatalogExplanationDefinition } from "./custom-explanation";
import { CUSTOM_REPORT_COMPONENT, type CatalogReportDefinition } from "./custom-report";
import type { CompatIssue } from "./shared";
import { normalizeIssuePath } from "./shared";

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
		pushIssue(issues, ["fields", index, ...normalizeIssuePath(issue.path)], issue.message);
	}

	if (!customDefinition) {
		return;
	}

	const descriptor = customDefinition.definition.describe(result.data as unknown as NormalizedFieldConfig, {
		fieldId: field.id ?? `field-${index + 1}`,
		state: idleFieldState,
	});

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
		pushIssue(issues, ["reports", index, ...normalizeIssuePath(issue.path)], issue.message);
	}

	if (!customDefinition) {
		return;
	}

	const descriptor = customDefinition.definition.describe(result.data as unknown as NormalizedReportConfig, {
		reportId: report.id ?? `report-${index + 1}`,
		state: idleReportState,
		payload: undefined,
		result: null,
	});

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
	const definition = builtinDefinition ?? customDefinition?.definition;

	if (!definition) {
		pushIssue(issues, ["explanations", index, "kind"], `Unknown explanation kind "${explanation.kind}".`);
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
