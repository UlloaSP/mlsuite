/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import { type JsonRecord, type PredictionPayloadField, isRecord } from "./shared";
import { normalizeAnalyzerPredictionResult } from "./analyzer-result-normalization";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { fetchSchemaCustomReports } from "./schema-run-custom-report-fetch";
import { schemaRunDebug, schemaRunDebugError } from "./schema-run-debug";
import { applySchemaRunInputMapping } from "./schema-run-input-mapping";
import { reportTargetForBinding, reportContextKey } from "./schema-run-report-mapping";
import { toCanonicalPayload, toFieldIdPayload, toVisiblePayload } from "./schema-run-payload";

type SchemaRunBinding = {
  modelId: string;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const failureOutput = (modelId: string, modelInput: JsonRecord): JsonRecord => ({
  meta: {
    modelId,
    backendUrl: getBackendBaseUrl(),
    backendFieldValues: modelInput,
  },
});

const runBinding = async (
  binding: SchemaRunBinding,
  fieldValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  reports: readonly ReportConfig[],
) => {
  const modelInput = applySchemaRunInputMapping(fieldValues, fields, binding);
  schemaRunDebug("transport.model.start", {
    modelId: binding.modelId,
    modelInputKeys: Object.keys(modelInput),
    requestedReports: reports.map((report) => ({ id: report.id, kind: report.kind })),
  });
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
      schemaRunDebug("transport.model.success", {
        modelId: binding.modelId,
        reportKeys: isRecord(normalized.raw.reports) ? Object.keys(normalized.raw.reports) : [],
        meta: normalized.meta,
      });
      return {
        modelId: binding.modelId,
        modelInput,
        output: normalized.raw,
        status: "SUCCESS" as const,
      };
    }
    schemaRunDebug("transport.model.failed-response", {
      modelId: binding.modelId,
      status: response.status,
      statusText: response.statusText,
      parsed,
    });
    return {
      modelId: binding.modelId,
      modelInput,
      output: failureOutput(binding.modelId, modelInput),
      status: "FAILED" as const,
      errorMessage:
        isRecord(parsed) && typeof parsed.message === "string"
          ? parsed.message
          : response.statusText,
      errorJson: isRecord(parsed) ? parsed : { raw: parsed },
    };
  } catch (error) {
    schemaRunDebugError("transport.model.exception", error, {
      modelId: binding.modelId,
    });
    return {
      modelId: binding.modelId,
      modelInput,
      output: failureOutput(binding.modelId, modelInput),
      status: "FAILED" as const,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorJson: {},
    };
  }
};

const reportKey = (report: ReportConfig): string | undefined =>
  typeof report.id === "string" ? report.id : undefined;

const findReportPayload = (target: string, output: JsonRecord): JsonRecord | undefined => {
  if (isRecord(output.reports) && isRecord(output.reports[target])) {
    return output.reports[target];
  }
  return undefined;
};

const storeReportPayload = (
  reports: JsonRecord,
  reportId: string,
  target: string,
  payload: unknown,
) => {
  reports[reportContextKey(reportId)] = payload;
  reports[reportId] = payload;
  reports[target] = payload;
};

const buildReports = (
  results: readonly Awaited<ReturnType<typeof runBinding>>[],
  bindings: readonly SchemaRunBinding[],
  reports: readonly ReportConfig[],
): { reports: JsonRecord; reportContextById: JsonRecord } => {
  return results.reduce<{ reports: JsonRecord; reportContextById: JsonRecord }>(
    (payload, result) => {
      if (result.status !== "SUCCESS") return payload;
      const binding = bindings.find((item) => item.modelId === result.modelId);
      if (!binding) {
        schemaRunDebug("transport.reports.no-binding", {
          modelId: result.modelId,
        });
        return payload;
      }
      reports.forEach((report) => {
        const canonicalId = reportKey(report);
        if (!canonicalId) return;
        const target = reportTargetForBinding(report, binding);
        if (!target) {
          schemaRunDebug("transport.reports.no-target", {
            modelId: result.modelId,
            reportId: canonicalId,
          });
          return;
        }
        const reportPayload = findReportPayload(target, result.output);
        const meta = isRecord(result.output.meta) ? result.output.meta : {};
        payload.reportContextById[reportContextKey(canonicalId)] = {
          modelId: result.modelId,
          modelInput: result.modelInput,
          meta,
          raw: result.output,
        };
        if (reportPayload !== undefined)
          storeReportPayload(payload.reports, canonicalId, target, reportPayload);
        schemaRunDebug("transport.reports.mapped", {
          modelId: result.modelId,
          reportId: canonicalId,
          contextKey: reportContextKey(canonicalId),
          target,
          hasPayload: reportPayload !== undefined,
        });
      });
      return payload;
    },
    { reports: {}, reportContextById: {} },
  );
};

export const createSchemaRunTransport = (
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
  customReportDefinitions: readonly CatalogReportDefinition[] = [],
  reportMappings: readonly unknown[] = [],
): Transport => ({
  async submit(request: SubmitRequest) {
    const reports = request.reports.map((report: ReportConfig, index: number) => {
      const mappedTo = reportMappings[index] ?? report.mappedTo;
      if (mappedTo === undefined) throw new Error(`Schema report ${index + 1} falta mappedTo`);
      return { ...report, mappedTo };
    });
    const canonical = toCanonicalPayload(request.serializedValues, fields);
    const fieldValues = toFieldIdPayload(request.serializedValues, fields);
    const inputData = toVisiblePayload(request.serializedValues, fields);
    schemaRunDebug("transport.submit.start", {
      serializedKeys: Object.keys(request.serializedValues),
      canonicalKeys: Object.keys(canonical),
      fieldKeys: Object.keys(fieldValues),
      visibleKeys: Object.keys(inputData),
      bindings: bindings.map((binding) => ({
        modelId: binding.modelId,
      })),
      reports: reports.map((report: ReportConfig) => ({ id: report.id, kind: report.kind })),
    });
    const initialResults = await Promise.all(
      bindings.map((binding) => runBinding(binding, request.serializedValues, fields, reports)),
    );
    const built = buildReports(initialResults, bindings, reports);
    schemaRunDebug("transport.submit.after-models", {
      statuses: initialResults.map((result) => ({
        modelId: result.modelId,
        status: result.status,
      })),
      reportKeys: Object.keys(built.reports),
      contextKeys: Object.keys(built.reportContextById),
    });
    const results = await fetchSchemaCustomReports({
      request,
      reports,
      built,
      results: initialResults,
      bindings,
      definitions: customReportDefinitions,
    });
    schemaRunDebug("transport.submit.after-custom-reports", {
      reportKeys: Object.keys(built.reports),
      contextKeys: Object.keys(built.reportContextById),
      statuses: results.map((result) => ({
        modelId: result.modelId,
        status: result.status,
      })),
    });
    const meta = {
      backendUrl: getBackendBaseUrl(),
      backendFieldValues: canonical,
      schemaRun: true,
      reportContextById: built.reportContextById,
    };
    return {
      reports: built.reports,
      meta,
      raw: {
        inputData,
        modelInputData: canonical,
        results,
        reports: built.reports,
        meta,
        reportContextById: built.reportContextById,
      },
    };
  },
});
