/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, Transport } from "mlform/runtime";
import type { ReportResult } from "mlform/schema";
import { createFanoutTransport } from "mlform/transport";
import { appFetch, json } from "@/shared/api/http";
import { retryWhileBusy } from "@/shared/api/busy-retry";
import type { WorkspacePredictionDto, WorkspacePredictionRequest } from "@/shared/api/openapi.gen";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import {
  type RuntimeReportRoute,
  runtimeReportRoutes,
} from "@/capabilities/prediction-runtime/mlform/runtime-report-targets";
import { findStoredReport } from "@/capabilities/prediction-runtime/data/stored-report";
import {
  type JsonRecord,
  type PredictionPayloadField,
  isRecord,
  storedReportPayload,
} from "@/capabilities/prediction-runtime/mlform/shared";

export type SchemaRunBinding = {
  modelId: number;
  modelName?: string;
  pluginPolicy?: JsonRecord;
};

/** The bookmark whose snapshot the form runs; the server runs each model for it. */
export type SchemaRunTarget = {
  bookmarkId: number | string;
  schemaVersionId: number;
};

/**
 * The server runs the model and answers with the result as a saved run will store it, sealed;
 * a record the model refuses comes back as a failed result. A run the server's queue could not
 * take is sent again as its Retry-After asks; any other refusal fails the run.
 */
const runBinding = (
  target: SchemaRunTarget,
  binding: SchemaRunBinding,
  modelValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  signal?: AbortSignal,
): Promise<WorkspacePredictionDto> => {
  const request: WorkspacePredictionRequest = {
    schemaVersionId: target.schemaVersionId,
    modelId: binding.modelId,
    modelInput: applySchemaRunInputMapping(modelValues, fields, binding),
    // The form's values the record was mapped from: the seal vouches for them, and the saved run keeps them.
    inputData: modelValues,
  };
  return retryWhileBusy(
    () =>
      appFetch<WorkspacePredictionDto>(
        `/api/schema-bookmarks/${encodeURIComponent(target.bookmarkId)}/predictions`,
        { ...json("POST", request), signal },
      ),
    signal,
  );
};

/**
 * One result for each report of the run form, routed as the form routes it: the stored copy
 * of that report in its model's result. A report the server stored no copy of is pending: a
 * plugin may still fetch it in the browser.
 */
const reportResults = (
  results: readonly WorkspacePredictionDto[],
  routes: readonly RuntimeReportRoute<SchemaRunBinding>[],
  reports: readonly ReportConfig[],
): ReportResult[] =>
  reports.map((report, index) => {
    const route = routes.find((candidate) => candidate.id === report.id);
    if (!route) throw new Error(`Schema report ${index + 1} does not map to any bound model.`);
    const { backend, key: mappedTo } = route;
    const result = results.find((candidate) => candidate.modelId === route.binding.modelId);
    if (!result || result.status === "FAILED") {
      return { backend, mappedTo, status: "skipped", reason: result?.errorMessage ?? "no-result" };
    }

    const output = result.output ?? {};
    // The model and the record it was given are the result's own; meta is what the runtime added.
    const meta = {
      modelId: result.modelId,
      backendFieldValues: result.modelInput,
      ...(isRecord(output.meta) ? output.meta : {}),
    };
    const context = { modelValues: result.modelInput, meta, raw: output };
    const copy = findStoredReport(output, route);
    return copy
      ? { backend, mappedTo, status: "ready", payload: storedReportPayload(copy), context }
      : { backend, mappedTo, status: "pending", context };
  });

const requestRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

/** Runs a stored schema's form against its bound models; `schema` is the form as stored. */
export const createSchemaRunTransport = (
  target: SchemaRunTarget,
  schema: unknown,
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
): Transport => {
  const routes = runtimeReportRoutes(schema, bindings);
  return createFanoutTransport({
    targets: bindings,
    failurePolicy: "fail-fast",
    submit: (binding, request) =>
      runBinding(target, binding, requestRecord(request.modelValues), fields, request.signal),
    merge: (outcomes, request) => {
      const reports = request.reports as readonly ReportConfig[];
      const canonical = requestRecord(request.modelValues);
      const inputData = requestRecord(request.displayValues);
      const results = outcomes.map((outcome) => {
        if (outcome.status !== "fulfilled") throw outcome.reason;
        return outcome.value;
      });
      const reportPayloads = reportResults(results, routes, reports);
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
};
