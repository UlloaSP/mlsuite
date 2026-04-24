/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	toMlformSchema,
} from "../app/utils/mlform/index";
import type { ModelDto, PredictionDto, SignatureDto } from "./api/modelService";
import { extractPredictionExplanationEntries } from "./explanation-feedback-utils";

type JsonRecord = Record<string, unknown>;

export type PredictionFeedbackStatus = "PENDING" | "COMPLETED";

export type SignatureSummaryStats = {
	fieldCount: number;
	reportCount: number;
	explanationsEnabled: boolean;
	fieldKinds: Record<string, number>;
	reportKinds: Record<string, number>;
	classifierLabelsCount: number;
};

export type ExplanationSnapshot = {
	label: string;
	explanations: string[];
	error: string | null;
} | null;

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const toIdString = (value: unknown): string => String(value ?? "");

export const findModelById = (models: ModelDto[], modelId?: string): ModelDto | undefined =>
	models.find((model) => toIdString(model.id) === toIdString(modelId));

export const findPredictionById = (
	predictions: PredictionDto[],
	predictionId?: string,
): PredictionDto | undefined =>
	predictions.find((prediction) => toIdString(prediction.id) === toIdString(predictionId));

export const getModelTypeLabel = (type: string): string => {
	switch (type) {
		case "classifier":
			return "Classifier";
		case "regressor":
			return "Regressor";
		default:
			return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : "Model";
	}
};

export const getModelAlgorithmLabel = (model: Pick<ModelDto, "type" | "specificType">): string =>
	`${getModelTypeLabel(model.type)} - ${model.specificType}`;

export const getSignatureVersionLabel = (
	signature: Pick<SignatureDto, "major" | "minor" | "patch">,
): string => `v${signature.major}.${signature.minor}.${signature.patch}`;

export const compareSignatureVersionsDesc = (left: SignatureDto, right: SignatureDto): number => {
	if (left.major !== right.major) {
		return right.major - left.major;
	}

	if (left.minor !== right.minor) {
		return right.minor - left.minor;
	}

	if (left.patch !== right.patch) {
		return right.patch - left.patch;
	}

	return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
};

export const getLatestSignature = (signatures: SignatureDto[]): SignatureDto | undefined =>
	[...signatures].sort(compareSignatureVersionsDesc)[0];

export const getModelDerivedMetric = (signatures: SignatureDto[]): string =>
	`${signatures.length} signature${signatures.length === 1 ? "" : "s"}`;

export const getPredictionStatus = (status: unknown): PredictionFeedbackStatus => {
	const normalized = String(status ?? "PENDING").toUpperCase();
	if (normalized === "COMPLETED" || normalized === "SUCCESS" || normalized === "FAILED") {
		return "COMPLETED";
	}
	return "PENDING";
};

export const getPredictionStatusTone = (status: unknown): "success" | "warning" => {
	switch (getPredictionStatus(status)) {
		case "COMPLETED":
			return "success";
		case "PENDING":
		default:
			return "warning";
	}
};

export const getPredictionStatusLabel = (status: unknown): string => {
	return getPredictionStatus(status) === "COMPLETED"
		? "Feedback completed"
		: "Feedback pending";
};

export const getPredictionShortId = (id: unknown): string => {
	const normalized = toIdString(id);
	return normalized.length <= 8 ? normalized : normalized.slice(0, 8);
};

export const getPredictionOutputs = (value: unknown): JsonRecord[] => {
	if (!isRecord(value) || !Array.isArray(value.outputs)) {
		return [];
	}

	return value.outputs.filter(isRecord);
};

export const getPredictionExecutionTime = (value: unknown): number | null => {
	const outputs = getPredictionOutputs(value);
	const executionTime = outputs[0]?.execution_time;
	return typeof executionTime === "number" ? executionTime : null;
};

export const formatExecutionTime = (time: number | null): string => {
	if (time === null) {
		return "N/A";
	}

	if (time < 1000) {
		return `${time.toFixed(2)} ms`;
	}

	if (time < 60000) {
		return `${(time / 1000).toFixed(2)} s`;
	}

	if (time < 3600000) {
		return `${(time / 60000).toFixed(2)} min`;
	}

	return `${(time / 3600000).toFixed(2)} h`;
};

export const getSignatureSummaryStats = (inputSignature: unknown): SignatureSummaryStats => {
	if (!isRecord(inputSignature)) {
		return {
			fieldCount: 0,
			reportCount: 0,
			explanationsEnabled: false,
			fieldKinds: {},
			reportKinds: {},
			classifierLabelsCount: 0,
		};
	}

	const fields = Array.isArray(inputSignature.fields)
		? inputSignature.fields.filter(isRecord)
		: [];
	const reports = Array.isArray(inputSignature.reports)
		? inputSignature.reports.filter(isRecord)
		: [];
	const explanations = Array.isArray(inputSignature.explanations)
		? inputSignature.explanations.filter(isRecord)
		: [];

	const fieldKinds = fields.reduce<Record<string, number>>((acc, field) => {
		const kind = typeof field.kind === "string" ? field.kind : "unknown";
		acc[kind] = (acc[kind] ?? 0) + 1;
		return acc;
	}, {});

	const reportKinds = reports.reduce<Record<string, number>>((acc, report) => {
		const kind = typeof report.kind === "string" ? report.kind : "unknown";
		acc[kind] = (acc[kind] ?? 0) + 1;
		return acc;
	}, {});

	const classifierLabelsCount = reports.reduce((count, report) => {
		if (report.kind !== "classifier" || !Array.isArray(report.labels)) {
			return count;
		}

		return Math.max(count, report.labels.length);
	}, 0);

	return {
		fieldCount: fields.length,
		reportCount: reports.length,
		explanationsEnabled: explanations.length > 0,
		fieldKinds,
		reportKinds,
		classifierLabelsCount,
	};
};

export const getExplanationSnapshot = (
	predictionValue: unknown,
	signatureSchema: unknown,
): ExplanationSnapshot => {
	if (!isRecord(predictionValue)) {
		return null;
	}

	const explanations = extractPredictionExplanationEntries(predictionValue, signatureSchema).map(
		(entry) => entry.content.join("\n\n"),
	);

	const meta = isRecord(predictionValue.meta) ? predictionValue.meta : null;
	const explainErrors = meta && isRecord(meta.explainErrors) ? meta.explainErrors : null;
	let reportLabel = "Model explanation";
	try {
		const schema = toMlformSchema(signatureSchema);
		const explanation = schema.explanations?.[0];
		if (explanation?.label) {
			reportLabel = `${explanation.label} explanation`;
		}
	} catch {
		reportLabel = "Model explanation";
	}
	const nextError = explainErrors
		? Object.values(explainErrors).find((value) => typeof value === "string") ?? null
		: null;
	const error = typeof nextError === "string" ? nextError : null;

	if (explanations.length === 0 && !error) {
		return null;
	}

	return {
		label: reportLabel,
		explanations,
		error,
	};
};

export const getPredictionDetailTitle = (prediction: PredictionDto): string =>
	prediction.name || `Prediction ${getPredictionShortId(prediction.id)}`;

export const getPredictionTimestamp = (
	prediction: Pick<PredictionDto, "createdAt" | "updatedAt">,
): string => prediction.updatedAt ?? prediction.createdAt;
