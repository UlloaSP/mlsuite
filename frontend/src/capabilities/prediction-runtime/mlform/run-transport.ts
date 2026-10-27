/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, Transport } from "mlform/runtime";
import type { ReportResult } from "mlform/schema";
import { createFanoutTransport } from "mlform/transport";
import { appFetch, json } from "@/shared/api/http";
import type { WorkspacePredictionDto, WorkspacePredictionRequest } from "@/shared/api/openapi.gen";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import {
  type JsonRecord,
  type PredictionPayloadField,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";

type SchemaRunBinding = {
  modelId: number;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};

/** The bookmark whose snapshot the form runs; the server runs each model for it. */
export type SchemaRunTarget = {
  bookmarkId: number | string;
  schemaVersionId: number;
};

/**
 * The server runs the model and answers with the result as a saved run will store it, sealed;
 * a record the model refuses comes back as a failed result. Any other refusal fails the run.
 */
const runBinding = (
  target: SchemaRunTarget,
  binding: SchemaRunBinding,
  modelValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
): Promise<WorkspacePredictionDto> => {
  const request: WorkspacePredictionRequest = {
    schemaVersionId: target.schemaVersionId,
    modelId: binding.modelId,
    modelInput: applySchemaRunInputMapping(modelValues, fields, binding),
  };
  return appFetch<WorkspacePredictionDto>(
    `/api/schema-bookmarks/${encodeURIComponent(target.bookmarkId)}/predictions`,
    json("POST", request),
  );
};

const findReportPayload = (target: string, output: JsonRecord): JsonRecord | undefined =>
  (Array.isArray(output.reports) ? output.reports.filter(isRecord) : []).find(
    (item) => String(item.mappedTo) === target,
  );

const payloadValue = (report: JsonRecord): unknown => {
  if ("payload" in report) return report.payload;
  const { id: _id, kind: _kind, mappedTo: _mappedTo, ...payload } = report;
  void _id;
  void _kind;
  void _mappedTo;
  return payload;
};

const reportResults = (
  results: readonly WorkspacePredictionDto[],
  bindings: readonly SchemaRunBinding[],
  reports: readonly ReportConfig[],
): ReportResult[] =>
  reports.map((report, index) => {
    const binding = bindings.find((candidate) => reportTargetForBinding(report, candidate));
    if (!binding) throw new Error(`Schema report ${index + 1} no coincide con ningún modelo`);
    const mappedTo = reportTargetForBinding(report, binding);
    if (!mappedTo) throw new Error(`Schema report ${index + 1} falta mappedTo`);
    const backend = String(binding.modelName ?? binding.modelId);
    const result = results.find((candidate) => candidate.modelId === binding.modelId);
    if (!result || result.status === "FAILED") {
      return { backend, mappedTo, status: "skipped", reason: result?.errorMessage ?? "no-result" };
    }

    const meta = isRecord(result.output.meta) ? result.output.meta : {};
    const context = { modelValues: result.modelInput, meta, raw: result.output };
    const payload = findReportPayload(mappedTo, result.output);
    return payload
      ? { backend, mappedTo, status: "ready", payload: payloadValue(payload), context }
      : { backend, mappedTo, status: "pending", context };
  });

const requestRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

export const createSchemaRunTransport = (
  target: SchemaRunTarget,
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
): Transport =>
  createFanoutTransport({
    targets: bindings,
    failurePolicy: "fail-fast",
    submit: (binding, request) =>
      runBinding(target, binding, requestRecord(request.modelValues), fields),
    merge: (outcomes, request) => {
      const reports = request.reports as readonly ReportConfig[];
      const canonical = requestRecord(request.modelValues);
      const inputData = requestRecord(request.displayValues);
      const results = outcomes.map((outcome) => {
        if (outcome.status !== "fulfilled") throw outcome.reason;
        return outcome.value;
      });
      const reportPayloads = reportResults(results, bindings, reports);
      const meta = {
        backendUrl: getBackendBaseUrl(),
        backendFieldValues: canonical,
        schemaRun: true,
      };
      return {
        reports: reportPayloads,
        meta,
        raw: {
          inputData,
          modelInputData: canonical,
          results,
          reports: reportPayloads,
          meta,
        },
      };
    },
  });
