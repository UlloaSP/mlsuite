/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import { type JsonRecord, type PredictionPayloadField, getString, isRecord } from "./shared";
import { toLegacyReportPayload } from "./report-normalization";
import { normalizeAnalyzerPredictionResult } from "./analyzer-result-normalization";
import type { CatalogReportDefinition } from "./custom-report";
import { fetchSchemaCustomReports } from "./schema-run-custom-report-fetch";
import { mappingSourceForReport, reportContextKey } from "./schema-run-report-mapping";

type SchemaRunBinding = {
  modelId: string;
  signatureId: string;
  inputMapping?: JsonRecord;
  outputMapping?: JsonRecord;
  pluginPolicy?: JsonRecord | null;
};

const hasMappedOptions = (field: PredictionPayloadField): boolean =>
  Array.isArray((field as Record<string, unknown>).options) &&
  ((field as Record<string, unknown>).options as unknown[]).some(
    (option) => isRecord(option) && isRecord(option.mapping),
  );

const shouldInclude = (field: PredictionPayloadField): boolean =>
  field.includeInSubmission !== false &&
  !(field.kind === "mapped-category" && hasMappedOptions(field));

const expandMappedCategoryValues = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): Record<string, unknown> => {
  const values = { ...serializedValues };
  fields.forEach((field) => {
    const selectedValue =
      field.id in serializedValues
        ? serializedValues[field.id]
        : (field as Record<string, unknown>).defaultValue;
    if (field.kind !== "mapped-category" || selectedValue === undefined) return;
    const options = Array.isArray((field as Record<string, unknown>).options)
      ? ((field as Record<string, unknown>).options as unknown[]).filter(isRecord)
      : [];
    values[field.id] = selectedValue;
    const selected = options.find((option) => String(option.value) === String(selectedValue));
    if (!isRecord(selected?.mapping)) return;
    Object.entries(selected.mapping).forEach(([targetFieldId, mappedValue]) => {
      values[targetFieldId] = mappedValue;
    });
  });
  return values;
};

const toCanonicalPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord => {
  const expandedValues = expandMappedCategoryValues(serializedValues, fields);
  return fields.reduce<JsonRecord>((payload, field) => {
    if (shouldInclude(field) && field.id in expandedValues) {
      payload[getString(field.label) ?? field.id] = expandedValues[field.id];
    }
    return payload;
  }, {});
};

const toVisiblePayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord =>
  fields.reduce<JsonRecord>((payload, field) => {
    const value =
      field.id in serializedValues
        ? serializedValues[field.id]
        : (field as Record<string, unknown>).defaultValue;
    if ((field as Record<string, unknown>).hidden !== true && value !== undefined) {
      payload[getString(field.label) ?? field.id] = value;
    }
    return payload;
  }, {});

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
  const formData = new FormData();
  formData.set("data", new File([JSON.stringify(modelInput)], "data.json", { type: "application/json" }));
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
      return {
        modelId: binding.modelId,
        signatureId: binding.signatureId,
        modelInput,
        output: normalized.raw,
        status: "SUCCESS" as const,
      };
    }
    return {
      modelId: binding.modelId,
      signatureId: binding.signatureId,
      modelInput,
      output: failureOutput(binding.modelId, modelInput),
      status: "FAILED" as const,
      errorMessage: isRecord(parsed) && typeof parsed.message === "string" ? parsed.message : response.statusText,
      errorJson: isRecord(parsed) ? parsed : { raw: parsed },
    };
  } catch (error) {
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
  return results.reduce<{ reports: JsonRecord; reportContextById: JsonRecord }>((payload, result) => {
    if (result.status !== "SUCCESS") return payload;
    const binding = bindings.find(
      (item) => item.modelId === result.modelId && item.signatureId === result.signatureId,
    );
    if (!binding || !isRecord(binding.outputMapping)) return payload;
    reports.forEach((report) => {
      const canonicalId = reportKey(report);
      if (!canonicalId) return;
      const source = mappingSourceForReport(binding.outputMapping, canonicalId);
      if (!source) return;
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
    });
    return payload;
  }, { reports: {}, reportContextById: {} });
};

export const createSchemaRunTransport = (
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
  customReportDefinitions: readonly CatalogReportDefinition[] = [],
): Transport => ({
  async submit(request: SubmitRequest) {
    const canonical = toCanonicalPayload(request.serializedValues, fields);
    const inputData = toVisiblePayload(request.serializedValues, fields);
    const initialResults = await Promise.all(
      bindings.map((binding) => runBinding(binding, canonical, request.reports)),
    );
    const built = buildReports(initialResults, bindings, request.reports);
    const results = await fetchSchemaCustomReports({
      request,
      reports: request.reports,
      built,
      results: initialResults,
      bindings,
      definitions: customReportDefinitions,
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
