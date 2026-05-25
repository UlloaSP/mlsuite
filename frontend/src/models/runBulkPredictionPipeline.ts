/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { executeFormPipeline } from "mlform/runtime";
import { createHeadlessPredictionForm } from "../app/utils/mlform/headless-prediction";
import type { CatalogFieldDefinition } from "../app/utils/mlform/custom-field";
import type { CatalogReportDefinition } from "../app/utils/mlform/custom-report";
import { type PredictionPayloadField, getBackendKey } from "../app/utils/mlform/shared";
import {
  buildPersistedPredictionPayload,
  type PersistedExplanationState,
} from "./buildPersistedPredictionPayload";
import { isExplanationReportConfig } from "./report-contract";

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
  signal?: AbortSignal;
};

export async function runBulkPredictionPipeline({
  schema,
  modelId,
  inputs,
  customFieldDefinitions = [],
  customReportDefinitions = [],
  signal,
}: RunBulkPredictionPipelineOptions): Promise<Record<string, unknown>> {
  const { form, normalizedFields } = createHeadlessPredictionForm({
    schema,
    modelId,
    customFieldDefinitions,
    customReportDefinitions,
  });

  form.setValues(mapInputsToFieldValues(inputs, normalizedFields));

  const result = await executeFormPipeline({
    form,
    submit: { signal },
    reportFetchMode: "all",
    artifactAdapter: {
      derive({ submitResult, reportFetchResults, reportFetchErrors }) {
        const explanations = form.reports.reduce<PersistedExplanationState[]>(
          (items, explanation) => {
            if (!isExplanationReportConfig(explanation)) {
              return items;
            }
            items.push({
              id: explanation.id,
              status:
                explanation.id in reportFetchResults
                  ? "done"
                  : explanation.id in reportFetchErrors
                    ? "error"
                    : "idle",
              result: reportFetchResults[explanation.id],
              error: reportFetchErrors[explanation.id] ?? null,
            });
            return items;
          },
          [],
        );
        return buildPersistedPredictionPayload(submitResult.raw, explanations);
      },
    },
  });

  return result.artifacts;
}
