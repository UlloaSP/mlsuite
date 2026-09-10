/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import type { ReportResult } from "mlform/schema";
import { createFanoutTransport } from "mlform/transport";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import { normalizeAnalyzerPredictionResult } from "@/capabilities/prediction-runtime/data/analyzer-result-normalization";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import {
  schemaRunDebug,
  schemaRunDebugError,
} from "@/capabilities/prediction-runtime/mlform/run-debug";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import {
  type JsonRecord,
  type PredictionPayloadField,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";

type SchemaRunBinding = {
  modelId: string;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};

type BindingResult = {
  modelId: string;
  modelInput: JsonRecord;
  output: JsonRecord;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  errorJson?: JsonRecord;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const failureOutput = (modelId: string, modelInput: JsonRecord): JsonRecord => ({
  meta: { modelId, backendUrl: getBackendBaseUrl(), backendFieldValues: modelInput },
});

const runBinding = async (
  binding: SchemaRunBinding,
  modelValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  reports: readonly ReportConfig[],
): Promise<BindingResult> => {
  const modelInput = applySchemaRunInputMapping(modelValues, fields, binding);
  const formData = new FormData();
  formData.set(
    "data",
    new File([JSON.stringify(modelInput)], "data.json", { type: "application/json" }),
  );
  try {
    const response = await fetch(
      `${getBackendBaseUrl()}/api/analyzer/predictions?modelId=${binding.modelId}`,
      { method: "POST", body: formData, credentials: "include" },
    );
    const parsed = await parseResponse(response);
    if (response.ok) {
      const normalized = normalizeAnalyzerPredictionResult({
        parsed,
        modelId: binding.modelId,
        modelName: binding.modelName,
        modelInput,
        reports,
      });
      return {
        modelId: binding.modelId,
        modelInput,
        output: normalized.raw,
        status: "SUCCESS",
      };
    }
    return {
      modelId: binding.modelId,
      modelInput,
      output: failureOutput(binding.modelId, modelInput),
      status: "FAILED",
      errorMessage:
        isRecord(parsed) && typeof parsed.message === "string"
          ? parsed.message
          : response.statusText,
      errorJson: isRecord(parsed) ? parsed : { raw: parsed },
    };
  } catch (error) {
    schemaRunDebugError("transport.model.exception", error, { modelId: binding.modelId });
    return {
      modelId: binding.modelId,
      modelInput,
      output: failureOutput(binding.modelId, modelInput),
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorJson: {},
    };
  }
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
  results: readonly BindingResult[],
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
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
): Transport =>
  createFanoutTransport({
    targets: bindings,
    failurePolicy: "fail-fast",
    submit: (binding, request) => {
      const reports = request.reports as readonly ReportConfig[];
      return runBinding(binding, requestRecord(request.modelValues), fields, reports);
    },
    merge: (outcomes, request: SubmitRequest) => {
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
      schemaRunDebug("transport.submit.done", { results, reportPayloads });
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
