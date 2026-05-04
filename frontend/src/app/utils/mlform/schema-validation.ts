/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormSchema } from "mlform/engine";
import type { CatalogFieldDefinition } from "./custom-field";
import type { CatalogExplanationDefinition } from "./custom-explanation";
import type { CatalogReportDefinition } from "./custom-report";
import { isBuiltinFieldKind, isBuiltinReportKind } from "./builtin-registry";
import {
	mlformJsonSchema,
	validateMlformSchema as validateBaseMlformSchema,
} from "./schema";
import type { CompatIssue, CompatValidationResult } from "./shared";
import { hasBlockingIssues, isRecord } from "./shared";

type ValidateMlformSchemaOptions = {
	customFieldDefinitions?: readonly CatalogFieldDefinition[];
	customReportDefinitions?: readonly CatalogReportDefinition[];
	customExplanationDefinitions?: readonly CatalogExplanationDefinition[];
};

const makeUnknownKindIssue = (
	path: Array<string | number>,
	type: "field" | "report" | "explanation",
	kind: string,
): CompatIssue => ({
	path,
	message: `Custom ${type} kind "${kind}" does not exist in active plugin catalog.`,
	severity: "error",
});

const makeInactiveKindIssue = (
	path: Array<string | number>,
	type: "field" | "report" | "explanation",
	kind: string,
): CompatIssue => ({
	path,
	message: `Custom ${type} kind "${kind}" exists but is inactive.`,
	severity: "error",
});

const appendFieldIssues = (
	schema: unknown,
	allKinds: Set<string>,
	activeKinds: Set<string>,
	issues: CompatIssue[],
) => {
	if (!isRecord(schema) || !Array.isArray(schema.fields)) {
		return;
	}
	schema.fields.forEach((field, index) => {
		if (!isRecord(field) || typeof field.kind !== "string" || isBuiltinFieldKind(field.kind)) {
			return;
		}
		if (!allKinds.has(field.kind)) {
			issues.push(makeUnknownKindIssue(["fields", index, "kind"], "field", field.kind));
			return;
		}
		if (!activeKinds.has(field.kind)) {
			issues.push(makeInactiveKindIssue(["fields", index, "kind"], "field", field.kind));
		}
	});
};

const appendReportIssues = (
	schema: unknown,
	allKinds: Set<string>,
	activeKinds: Set<string>,
	issues: CompatIssue[],
) => {
	if (!isRecord(schema) || !Array.isArray(schema.reports)) {
		return;
	}
	schema.reports.forEach((report, index) => {
		if (!isRecord(report) || typeof report.kind !== "string" || isBuiltinReportKind(report.kind)) {
			return;
		}
		if (!allKinds.has(report.kind)) {
			issues.push(makeUnknownKindIssue(["reports", index, "kind"], "report", report.kind));
			return;
		}
		if (!activeKinds.has(report.kind)) {
			issues.push(makeInactiveKindIssue(["reports", index, "kind"], "report", report.kind));
		}
	});
};

const appendExplanationIssues = (
	schema: unknown,
	allKinds: Set<string>,
	activeKinds: Set<string>,
	issues: CompatIssue[],
) => {
	if (!isRecord(schema) || !Array.isArray(schema.explanations)) {
		return;
	}
	schema.explanations.forEach((explanation, index) => {
		if (!isRecord(explanation) || typeof explanation.kind !== "string") {
			return;
		}
		if (!allKinds.has(explanation.kind)) {
			issues.push(makeUnknownKindIssue(["explanations", index, "kind"], "explanation", explanation.kind));
			return;
		}
		if (!activeKinds.has(explanation.kind)) {
			issues.push(makeInactiveKindIssue(["explanations", index, "kind"], "explanation", explanation.kind));
		}
	});
};

const mergeIssues = (
	schema: unknown,
	baseIssues: readonly CompatIssue[],
	options: ValidateMlformSchemaOptions,
): CompatIssue[] => {
	const filteredIssues = baseIssues.filter((issue) => {
		const [section, index, property] = issue.path;
		if (property !== "kind" || typeof index !== "number" || !isRecord(schema)) {
			return true;
		}
		if (section === "fields" && Array.isArray(schema.fields)) {
			const field = schema.fields[index];
			return !isRecord(field) || typeof field.kind !== "string" || isBuiltinFieldKind(field.kind);
		}
		if (section === "reports" && Array.isArray(schema.reports)) {
			const report = schema.reports[index];
			return !isRecord(report) || typeof report.kind !== "string" || isBuiltinReportKind(report.kind);
		}
		if (section === "explanations" && Array.isArray(schema.explanations)) {
			const explanation = schema.explanations[index];
			return !isRecord(explanation) || typeof explanation.kind !== "string";
		}
		return true;
	});
	const allFieldKinds = new Set((options.customFieldDefinitions ?? []).map((definition) => definition.kind));
	const activeFieldKinds = new Set(
		(options.customFieldDefinitions ?? [])
			.filter((definition) => definition.active)
			.map((definition) => definition.kind),
	);
	const allReportKinds = new Set((options.customReportDefinitions ?? []).map((definition) => definition.kind));
	const activeReportKinds = new Set(
		(options.customReportDefinitions ?? [])
			.filter((definition) => definition.active)
			.map((definition) => definition.kind),
	);
	const allExplanationKinds = new Set(
		(options.customExplanationDefinitions ?? []).map((definition) => definition.kind),
	);
	const activeExplanationKinds = new Set(
		(options.customExplanationDefinitions ?? [])
			.filter((definition) => definition.active)
			.map((definition) => definition.kind),
	);
	appendFieldIssues(schema, allFieldKinds, activeFieldKinds, filteredIssues);
	appendReportIssues(schema, allReportKinds, activeReportKinds, filteredIssues);
	appendExplanationIssues(schema, allExplanationKinds, activeExplanationKinds, filteredIssues);
	return filteredIssues;
};

export const validateMlformSchema = (
	schema: unknown,
	options: ValidateMlformSchemaOptions = {},
): CompatValidationResult => {
	const baseResult = validateBaseMlformSchema(schema, options);
	const issues = mergeIssues(schema, baseResult.issues, options);
	if (!baseResult.success) {
		return { success: false, issues };
	}
	if (hasBlockingIssues(issues)) {
		return { success: false, issues };
	}
	return {
		success: true,
		data: baseResult.data,
		issues,
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

export { mlformJsonSchema };
