/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { executeFormPipeline } from "mlform/runtime";
import { createHeadlessPredictionForm } from "../app/utils/mlform/headless-prediction";
import type { CatalogFieldDefinition } from "../app/utils/mlform/custom-field";
import type { CatalogExplanationDefinition } from "../app/utils/mlform/custom-explanation";
import type { CatalogReportDefinition } from "../app/utils/mlform/custom-report";
import { type PredictionPayloadField, getBackendKey } from "../app/utils/mlform/shared";
import {
	buildPersistedPredictionPayload,
	type PersistedExplanationState,
} from "./buildPersistedPredictionPayload";

const mapInputsToFieldValues = (
	inputs: Record<string, unknown>,
	normalizedFields: readonly PredictionPayloadField[],
) =>
	Object.fromEntries(
		normalizedFields.flatMap((field) => {
			const backendKey = getBackendKey(field);
			return backendKey in inputs ? [[field.id, inputs[backendKey]]] : [];
		}),
	);

type RunBulkPredictionPipelineOptions = {
	schema: unknown;
	modelId: string;
	inputs: Record<string, unknown>;
	customFieldDefinitions?: readonly CatalogFieldDefinition[];
	customReportDefinitions?: readonly CatalogReportDefinition[];
	customExplanationDefinitions?: readonly CatalogExplanationDefinition[];
	signal?: AbortSignal;
};

export async function runBulkPredictionPipeline({
	schema,
	modelId,
	inputs,
	customFieldDefinitions = [],
	customReportDefinitions = [],
	customExplanationDefinitions = [],
	signal,
}: RunBulkPredictionPipelineOptions): Promise<Record<string, unknown>> {
	const { form, normalizedFields } = createHeadlessPredictionForm({
		schema,
		modelId,
		customFieldDefinitions,
		customReportDefinitions,
		customExplanationDefinitions,
	});

	form.setValues(mapInputsToFieldValues(inputs, normalizedFields));

	const result = await executeFormPipeline({
		form,
		submit: { signal },
		explanationMode: "all",
		artifactAdapter: {
			derive({ submitResult, explanationResults, explanationErrors }) {
				const explanations: PersistedExplanationState[] = form.explanations.map((explanation) => ({
					id: explanation.id,
					status:
						explanation.id in explanationResults
							? "done"
							: explanation.id in explanationErrors
								? "error"
								: "idle",
					result: explanationResults[explanation.id],
					error: explanationErrors[explanation.id] ?? null,
				}));
				return buildPersistedPredictionPayload(submitResult.raw, explanations);
			},
		},
	});

	return result.artifacts;
}
