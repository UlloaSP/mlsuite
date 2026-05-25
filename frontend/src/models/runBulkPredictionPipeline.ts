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
  type PersistedReportState,
} from "./buildPersistedPredictionPayload";
import { isFeedbackReportConfig } from "./report-contract";

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
        const feedbackReports = form.reports.reduce<PersistedReportState[]>(
          (items, report) => {
            if (!isFeedbackReportConfig(report)) {
              return items;
            }
            items.push({
              id: report.id,
              status:
                report.id in reportFetchResults
                  ? "done"
                  : report.id in reportFetchErrors
                    ? "error"
                    : "idle",
              result: reportFetchResults[report.id],
              error: reportFetchErrors[report.id] ?? null,
            });
            return items;
          },
          [],
        );
        return buildPersistedPredictionPayload(submitResult.raw, feedbackReports);
      },
    },
  });

  return result.artifacts;
}
