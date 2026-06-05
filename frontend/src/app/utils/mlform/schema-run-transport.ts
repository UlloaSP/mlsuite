/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import { type JsonRecord, type PredictionPayloadField, isRecord } from "./shared";
import { toLegacyReportPayload } from "./report-normalization";
import { normalizeAnalyzerPredictionResult } from "./analyzer-result-normalization";
import type { CatalogReportDefinition } from "./custom-report";
import { fetchSchemaCustomReports } from "./schema-run-custom-report-fetch";
import { schemaRunDebug, schemaRunDebugError } from "./schema-run-debug";
import { mappingSourceForReport, reportContextKey } from "./schema-run-report-mapping";
import { toCanonicalPayload, toVisiblePayload } from "./schema-run-payload";

type SchemaRunBinding = {
  modelId: string;
  signatureId: string;
  inputMapping?: JsonRecord;
  outputMapping?: JsonRecord;
  pluginPolicy?: JsonRecord | null;
};

const applyInputMapping = (canonical: JsonRecord, mapping?: JsonRecord): JsonRecord => {
  if (!mapping || Object.keys(mapping).length === 0) {
    return { ...canonical };
  }
  return Object.entries(mapping).reduce<JsonRecord>((payload, [canonicalKey, modelKey]) => {
    if (typeof modelKey === "string" && canonicalKey in canonical) {
      payload[modelKey] = canonical[canonicalKey];
    }
    return payload;
  }, {});
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
  canonical: JsonRecord,
  reports: readonly ReportConfig[],
) => {
  const modelInput = applyInputMapping(canonical, binding.inputMapping);
  schemaRunDebug("transport.model.start", {
    modelId: binding.modelId,
    signatureId: binding.signatureId,
    modelInputKeys: Object.keys(modelInput),
    requestedReports: reports.map((report) => ({
      id: report.id,
      kind: report.kind,
      source: report.source,
    })),
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
        signatureId: binding.signatureId,
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
      signatureId: binding.signatureId,
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
      signatureId: binding.signatureId,
    });
    return {
      modelId: binding.modelId,
      signatureId: binding.signatureId,
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

const reportSource = (report: ReportConfig): string | undefined =>
  typeof report.source === "string" ? report.source : reportKey(report);

const findReportPayload = (
  report: ReportConfig,
  source: string,
  output: JsonRecord,
): JsonRecord | undefined => {
  if (isRecord(output.reports) && isRecord(output.reports[source])) {
    return output.reports[source];
  }
  const fallbackSource = reportSource(report);
  if (fallbackSource && isRecord(output.reports) && isRecord(output.reports[fallbackSource])) {
    return output.reports[fallbackSource];
  }
  return toLegacyReportPayload(report, output);
};

const buildReports = (
  results: readonly Awaited<ReturnType<typeof runBinding>>[],
  bindings: readonly SchemaRunBinding[],
  reports: readonly ReportConfig[],
): { reports: JsonRecord; reportContextById: JsonRecord } => {
  return results.reduce<{ reports: JsonRecord; reportContextById: JsonRecord }>(
    (payload, result) => {
      if (result.status !== "SUCCESS") return payload;
      const binding = bindings.find(
        (item) => item.modelId === result.modelId && item.signatureId === result.signatureId,
      );
      if (!binding || !isRecord(binding.outputMapping)) {
        schemaRunDebug("transport.reports.no-binding-or-mapping", {
          modelId: result.modelId,
          signatureId: result.signatureId,
          hasBinding: Boolean(binding),
        });
        return payload;
      }
      reports.forEach((report) => {
        const canonicalId = reportKey(report);
        if (!canonicalId) return;
        const source = mappingSourceForReport(binding.outputMapping, canonicalId);
        if (!source) {
          schemaRunDebug("transport.reports.no-source", {
            modelId: result.modelId,
            reportId: canonicalId,
            mappingKeys: Object.keys(binding.outputMapping ?? {}),
          });
          return;
        }
        const reportPayload = findReportPayload(report, source, result.output);
        const meta = isRecord(result.output.meta) ? result.output.meta : {};
        payload.reportContextById[reportContextKey(canonicalId)] = {
          modelId: result.modelId,
          signatureId: result.signatureId,
          modelInput: result.modelInput,
          meta,
          raw: result.output,
        };
        if (reportPayload !== undefined) {
          payload.reports[reportContextKey(canonicalId)] = reportPayload;
        }
        schemaRunDebug("transport.reports.mapped", {
          modelId: result.modelId,
          reportId: canonicalId,
          contextKey: reportContextKey(canonicalId),
          source,
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
): Transport => ({
  async submit(request: SubmitRequest) {
    const canonical = toCanonicalPayload(request.serializedValues, fields);
    const inputData = toVisiblePayload(request.serializedValues, fields);
    schemaRunDebug("transport.submit.start", {
      serializedKeys: Object.keys(request.serializedValues),
      canonicalKeys: Object.keys(canonical),
      visibleKeys: Object.keys(inputData),
      bindings: bindings.map((binding) => ({
        modelId: binding.modelId,
        signatureId: binding.signatureId,
        outputMappingKeys: Object.keys(binding.outputMapping ?? {}),
      })),
      reports: request.reports.map((report) => ({
        id: report.id,
        kind: report.kind,
        source: report.source,
      })),
    });
    const initialResults = await Promise.all(
      bindings.map((binding) => runBinding(binding, canonical, request.reports)),
    );
    const built = buildReports(initialResults, bindings, request.reports);
    schemaRunDebug("transport.submit.after-models", {
      statuses: initialResults.map((result) => ({
        modelId: result.modelId,
        signatureId: result.signatureId,
        status: result.status,
      })),
      reportKeys: Object.keys(built.reports),
      contextKeys: Object.keys(built.reportContextById),
    });
    const results = await fetchSchemaCustomReports({
      request,
      reports: request.reports,
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
        signatureId: result.signatureId,
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
