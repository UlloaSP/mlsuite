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
import { reportContextKey } from "./schema-run-report-mapping";
import {
  buildSchemaRunReportUsages,
  runtimeUsageForReport,
  type SchemaRunReportUsage,
} from "./schema-run-report-usages";
import { toCanonicalPayload, toVisiblePayload } from "./schema-run-payload";

type SchemaRunBinding = {
  modelId: string;
  signatureId: string;
  inputMapping?: JsonRecord;
  outputMapping?: JsonRecord;
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
  reports: readonly ReportConfig[],
  reportUsages: readonly SchemaRunReportUsage[],
): { reports: JsonRecord; reportContextById: JsonRecord } => {
  const usageCountByCanonicalId = reportUsages.reduce<Map<string, number>>((counts, usage) => {
    counts.set(usage.canonicalReportId, (counts.get(usage.canonicalReportId) ?? 0) + 1);
    return counts;
  }, new Map());
  return results.reduce<{ reports: JsonRecord; reportContextById: JsonRecord }>(
    (payload, result) => {
      if (result.status !== "SUCCESS") return payload;
      reports.forEach((report) => {
        const usage = runtimeUsageForReport(report, reportUsages);
        if (!usage) return;
        if (usage.modelId !== result.modelId || usage.signatureId !== result.signatureId) {
          return;
        }
        const runtimeId = reportKey(report);
        if (!runtimeId) return;
        const contextKey = reportContextKey(runtimeId);
        if (!usage.source) {
          schemaRunDebug("transport.reports.no-source", {
            modelId: result.modelId,
            reportId: usage.canonicalReportId,
          });
          return;
        }
        const reportPayload = findReportPayload(report, usage.source, result.output);
        const meta = isRecord(result.output.meta) ? result.output.meta : {};
        payload.reportContextById[contextKey] = {
          modelId: result.modelId,
          signatureId: result.signatureId,
          canonicalReportId: usage.canonicalReportId,
          source: usage.source,
          modelInput: result.modelInput,
          meta,
          raw: result.output,
        };
        if (reportPayload !== undefined) {
          payload.reports[contextKey] = reportPayload;
          if ((usageCountByCanonicalId.get(usage.canonicalReportId) ?? 0) === 1) {
            payload.reports[reportContextKey(usage.canonicalReportId)] = reportPayload;
          }
        }
        schemaRunDebug("transport.reports.mapped", {
          modelId: result.modelId,
          reportId: runtimeId,
          canonicalReportId: usage.canonicalReportId,
          contextKey,
          source: usage.source,
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
  reportUsages: readonly SchemaRunReportUsage[] = [],
): Transport => ({
  async submit(request: SubmitRequest) {
    const canonical = toCanonicalPayload(request.serializedValues, fields);
    const inputData = toVisiblePayload(request.serializedValues, fields);
    const activeUsages =
      reportUsages.length > 0
        ? reportUsages
        : buildSchemaRunReportUsages(bindings, request.reports);
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
      bindings.map((binding) =>
        runBinding(
          binding,
          canonical,
          request.reports.filter((report) => {
            const usage = runtimeUsageForReport(report, activeUsages);
            return usage?.modelId === binding.modelId && usage.signatureId === binding.signatureId;
          }),
        ),
      ),
    );
    const built = buildReports(initialResults, request.reports, activeUsages);
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
      reportUsages: activeUsages,
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
