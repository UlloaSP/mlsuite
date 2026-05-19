/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import {
	type JsonRecord,
	type PredictionPayloadField,
	getBackendKey,
	isRecord,
} from "./shared";

const toAnalyzerPayload = (
	serializedValues: Record<string, unknown>,
	fields: readonly PredictionPayloadField[],
): Record<string, unknown> =>
	fields.reduce<Record<string, unknown>>((payload, field) => {
		if (shouldIncludeInAnalyzerPayload(field) && field.id in serializedValues) {
			payload[getBackendKey(field)] = serializedValues[field.id];
		}
		return payload;
	}, {});

const hasMappedOptions = (field: PredictionPayloadField): boolean =>
	Array.isArray((field as Record<string, unknown>).options)
	&& ((field as Record<string, unknown>).options as unknown[]).some((option: unknown) =>
		isRecord(option) && isRecord(option.mapping)
	);

const shouldIncludeInAnalyzerPayload = (field: PredictionPayloadField): boolean =>
	field.includeInSubmission !== false &&
	!(field.kind === "mapped-category" && hasMappedOptions(field));

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

const getLegacyOutputs = (value: unknown): JsonRecord[] => {
	if (!isRecord(value) || !Array.isArray(value.outputs)) {
		return [];
	}

	return value.outputs.filter(isRecord);
};

const toNumericArray = (value: unknown): number[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.reduce<number[]>((items, item) => {
		const numeric = typeof item === "number" ? item : Number(item);
		if (!Number.isNaN(numeric)) {
			items.push(numeric);
		}
		return items;
	}, []);
};

const getClassifierPrediction = (output: JsonRecord): string | undefined => {
	const labels =
		Array.isArray(output.mapping)
			? output.mapping.filter((item): item is string => typeof item === "string")
			: [];
	const rawProbabilities = Array.isArray(output.probabilities)
		? output.probabilities[0]
		: undefined;
	const probabilities = toNumericArray(rawProbabilities);

	if (probabilities.length === 0) {
		return typeof output.label === "string" ? output.label : undefined;
	}

	const maxProbability = Math.max(...probabilities);
	const maxIndex = probabilities.indexOf(maxProbability);
	return labels[maxIndex];
};

const toLegacyReportPayload = (
	report: ReportConfig,
	parsed: unknown,
): JsonRecord | undefined => {
	const legacyOutput = getLegacyOutputs(parsed).find((output) => output.type === report.kind);

	if (!legacyOutput) {
		return undefined;
	}

	if (report.kind === "classifier") {
		const probabilities = Array.isArray(legacyOutput.probabilities)
			? toNumericArray(legacyOutput.probabilities[0])
			: [];
		const labels = Array.isArray(legacyOutput.mapping)
			? legacyOutput.mapping.filter((item): item is string => typeof item === "string")
			: undefined;

		return {
			...legacyOutput,
			probabilities,
			labels,
			prediction: getClassifierPrediction(legacyOutput),
		};
	}

	if (report.kind === "regressor") {
		return {
			...legacyOutput,
			values: toNumericArray(legacyOutput.values),
		};
	}

	return undefined;
};

export const createPredictionTransport = (
	modelId: string,
	fields: readonly PredictionPayloadField[],
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
			`${getBackendBaseUrl()}/api/analyzer/predictions?modelId=${modelId}`,
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

		const normalizedReports =
			isRecord(parsed) && isRecord(parsed.reports)
				? { ...parsed.reports }
				: {};
		const normalizedMeta =
			isRecord(parsed) && isRecord(parsed.meta)
				? { ...parsed.meta }
				: {};
		// Inestable: custom explanations like Mimosa currently depend on `meta.modelId`
		// even though prediction transport already carries modelId out-of-band in request URL.
		normalizedMeta.modelId ??= modelId;
		// Inestable y temporal: custom explanations still need backend base URL through `meta`
		// because some plugins resolve relative endpoints against frontend origin instead of API origin.
		normalizedMeta.backendUrl ??= getBackendBaseUrl();
		// Inestable y temporal: custom explanations may read form field ids instead of backend keys.
		// Keep backend-shaped inputs in meta so explanation runtime can patch old plugins.
		normalizedMeta.backendFieldValues ??= payload;
		const normalizedRaw = isRecord(parsed) ? parsed : { raw: parsed };

		request.reports.forEach((report: ReportConfig) => {
			const reportSource = report.source ?? report.id;
			if (!reportSource) {
				return;
			}

			if (normalizedReports[reportSource] !== undefined) {
				return;
			}

			const legacyPayload = toLegacyReportPayload(report, parsed);
			if (legacyPayload !== undefined) {
				normalizedReports[reportSource] = legacyPayload;
			}
		});

		return {
			reports: normalizedReports,
			meta: normalizedMeta,
			raw: {
				...normalizedRaw,
				reports: {
					...(isRecord(normalizedRaw.reports) ? normalizedRaw.reports : {}),
					...normalizedReports,
				},
				meta: {
					...(isRecord(normalizedRaw.meta) ? normalizedRaw.meta : {}),
					...normalizedMeta,
				},
			},
		};
	},
});
