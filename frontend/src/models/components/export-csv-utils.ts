/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ExplanationConfig } from "mlform/runtime";
import { toMlformSchema } from "../../app/utils/mlform/schema-validation";
import type { CatalogExplanationDefinition } from "../../app/utils/mlform/custom-explanation";
import { getQuestionnaireFieldIds } from "../questionnaire-feedback";

const isPlainObject = (value: unknown) =>
	value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

export const toRecord = (value: Record<string, unknown>): Record<string, unknown> =>
	value instanceof Map ? Object.fromEntries(value.entries()) : (value ?? {});

export const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	if (Array.isArray(obj)) {
		obj.forEach((value, index) =>
			Object.assign(out, flatten(value, prefix ? `${prefix}.${index}` : String(index))));
	} else if (isPlainObject(obj)) {
		Object.entries(obj as Record<string, unknown>).forEach(([key, value]) =>
			Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key)));
	} else {
		out[prefix || "value"] = obj;
	}
	return out;
};

export const toCell = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
};

export const csvEscape = (value: string, separator: string) => {
	let next = value;
	if (next.includes('"')) next = next.replace(/"/g, '""');
	if (next.includes(separator) || next.includes("\n") || next.includes("\r")) next = `"${next}"`;
	return next;
};

export const getExplanationHeaders = (
	signatureSchema: unknown,
	customExplanationDefinitions: readonly CatalogExplanationDefinition[],
	reviewerLabels: readonly string[] = [],
): string[] => {
	try {
		const schema = toMlformSchema(signatureSchema, {
			customExplanationDefinitions,
		});
		const definitionMap = new Map(
			customExplanationDefinitions.map((definition) => [definition.kind, definition]),
		);

		return (schema.explanations ?? []).flatMap((explanation: ExplanationConfig) => {
			const questionnaire = definitionMap.get(explanation.kind)?.definition.feedbackQuestionnaire;
			return [
				`explanation.${explanation.id}.content`,
				...(questionnaire
					? getQuestionnaireFieldIds(questionnaire).flatMap(
						(fieldId) => reviewerLabels.map(
							(reviewer) => `explanation.${explanation.id}.${fieldId}.${reviewer}`,
						),
					)
					: []),
			];
		});
	} catch {
		return [];
	}
};
