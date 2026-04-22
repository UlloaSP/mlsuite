/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeCustomExplanationResult } from "../app/utils/mlform/custom-explanation";
import { toMlformSchema } from "../app/utils/mlform";

type JsonRecord = Record<string, unknown>;

export type PredictionExplanationEntry = {
	order: number;
	label: string;
	value: string;
};

type ExplanationPayload = {
	explanations?: unknown;
};

type ExplanationReportDescriptor = {
	label: string;
	keys: string[];
};

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const stripTreeToken = (value: string): string =>
	value
		.trim()
		.replace(/^[*\d.)\-\s]+/, "")
		.replace(/^[|_\\/\->:\s]+/, "")
		.trim();

const formatExplanationTree = (value: string): string => {
	const parts = value
		.split(/(?:\s*\|\s*){2,}/)
		.map((part) => stripTreeToken(part))
		.filter((part) => part.length > 0);

	if (parts.length === 0) {
		return value.trim();
	}

	if (parts.length === 1) {
		return parts[0];
	}

	return parts
		.map((part, index) => {
			if (index === 0) {
				return part;
			}

			const indent = "  ".repeat(index - 1);
			return `${indent}└─ ${part}`;
		})
		.join("\n");
};

const normalizeDisplayedExplanation = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	if (trimmed.includes("|__") || trimmed.includes("||") || trimmed.startsWith("*")) {
		return formatExplanationTree(trimmed);
	}

	return trimmed;
};

const getConfiguredReportDescriptor = (signatureSchema: unknown): ExplanationReportDescriptor | null => {
	try {
		const schema = toMlformSchema(signatureSchema);
		const explanation = schema.explanations?.[0];
		if (!explanation) {
			return null;
		}
		return {
			label: explanation.label ? `${explanation.label} explanation` : "Model explanation",
			keys: [explanation.id, "model-explanation"].filter(
				(value): value is string => typeof value === "string" && value.trim().length > 0,
			),
		};
	} catch {
		return null;
	}
};

const getExplanationPayload = (
	predictionValue: unknown,
	signatureSchema?: unknown,
): { label: string; explanations: string[] } | null => {
	if (!isRecord(predictionValue)) {
		return null;
	}

	const report = signatureSchema ? getConfiguredReportDescriptor(signatureSchema) : null;
	const reports = isRecord(predictionValue.reports) ? predictionValue.reports : null;
	const fallbackReportEntries =
		reports
			? Object.entries(reports).filter(([, value]) => {
				if (!isRecord(value)) {
					return false;
				}
				const normalized = normalizeCustomExplanationResult(value);
				const hasLegacyExplanations =
					Array.isArray(value.explanations) &&
					value.explanations.some(
						(item) => typeof item === "string" && item.trim().length > 0,
					);
				return (
					hasLegacyExplanations ||
					normalized.blocks.length > 0 ||
					normalized.html !== null ||
					normalized.jsonFallback !== null
				);
			})
			: [];
	const explanationPayload =
		report && report.keys.length > 0
			? report.keys.reduce<ExplanationPayload | null>(
				(current, key) =>
					current ??
					(reports && isRecord(reports[key]) ? (reports[key] as ExplanationPayload) : null),
				null,
			)
			: fallbackReportEntries.length > 0 && isRecord(fallbackReportEntries[0][1])
				? (fallbackReportEntries[0][1] as ExplanationPayload)
				: null;
	const explanationsFromLegacyPayload =
		explanationPayload && Array.isArray(explanationPayload.explanations)
			? explanationPayload.explanations.filter(
				(item): item is string => typeof item === "string" && item.trim().length > 0,
			)
			: [];
	const normalizedExplanation =
		explanationPayload
			? normalizeCustomExplanationResult(explanationPayload)
			: fallbackReportEntries.length > 0
				? normalizeCustomExplanationResult(fallbackReportEntries[0][1])
				: null;
	const explanations = explanationsFromLegacyPayload.length > 0
		? explanationsFromLegacyPayload
		: normalizedExplanation
			? [
					...normalizedExplanation.blocks,
					...(normalizedExplanation.html ? [normalizedExplanation.html] : []),
					...(normalizedExplanation.jsonFallback ? [normalizedExplanation.jsonFallback] : []),
				].filter((item) => item.trim().length > 0)
			: [];

	if (explanations.length === 0) {
		return null;
	}

	return {
		label: report?.label ?? "Model explanation",
		explanations,
	};
};

export const extractPredictionExplanationEntries = (
	predictionValue: unknown,
	signatureSchema?: unknown,
): PredictionExplanationEntry[] => {
	const payload = getExplanationPayload(predictionValue, signatureSchema);
	if (!payload) {
		return [];
	}

	return payload.explanations.map((value, index) => ({
		order: index,
		label: `${payload.label} ${index + 1}`,
		value: normalizeDisplayedExplanation(value),
	}));
};
