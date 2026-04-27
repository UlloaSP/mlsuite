/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type JsonRecord = Record<string, unknown>;

export type PersistedExplanationState = {
	id: string;
	status: "idle" | "loading" | "done" | "error";
	result?: unknown;
	error?: string | null;
};

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export function buildPersistedPredictionPayload(
	raw: unknown,
	explanations: readonly PersistedExplanationState[],
): Record<string, unknown> {
	const base = isRecord(raw) ? raw : { raw };
	const reports = isRecord(base.reports) ? { ...base.reports } : {};
	const meta = isRecord(base.meta) ? { ...base.meta } : {};
	const explainErrors = isRecord(meta.explainErrors) ? { ...meta.explainErrors } : {};

	for (const explanation of explanations) {
		if (explanation.status === "done" && explanation.result !== undefined) {
			reports[explanation.id] = explanation.result;
			delete explainErrors[explanation.id];
		}
		if (explanation.status === "error" && explanation.error) {
			explainErrors[explanation.id] = explanation.error;
		}
	}

	const nextMeta: JsonRecord = { ...meta };
	if (Object.keys(explainErrors).length > 0) {
		nextMeta.explainErrors = explainErrors;
	} else {
		delete nextMeta.explainErrors;
	}

	return {
		...base,
		reports,
		meta: nextMeta,
	};
}
