/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CatalogExplanationDefinition } from "../app/utils/mlform/custom-explanation";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const applyExplanationFeedbackMetadata = (
	schema: unknown,
	customExplanationDefinitions: readonly CatalogExplanationDefinition[],
): Record<string, unknown> => {
	if (!isRecord(schema)) {
		return {};
	}

	const feedbackKinds = new Set(
		customExplanationDefinitions
			.filter((definition) => definition.definition.feedbackQuestionnaire)
			.map((definition) => definition.kind),
	);
	const explanations = Array.isArray(schema.explanations)
		? schema.explanations.map((item) => {
			if (!isRecord(item)) {
				return item;
			}

			const kind = typeof item.kind === "string" ? item.kind : "";
			return {
				...item,
				feedbackEnabled: feedbackKinds.has(kind),
			};
		})
		: schema.explanations;

	return {
		...schema,
		explanations,
	};
};
