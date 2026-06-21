/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import { type JsonRecord, type PredictionPayloadField, isRecord } from "../../mlform/shared";
import { normalizeAnalyzerPredictionResult } from "../../mlform/analyzer-result-normalization";
import { skippedReportIdsKey } from "../report-plugin-context";
import { schemaRunDebug, schemaRunDebugError } from "../run-debug";
import { applySchemaRunInputMapping } from "../model-input-mapping";
import { reportTargetForBinding, reportContextKey } from "../../mlform/schema-run-report-mapping";

type SchemaRunBinding = {
  modelId: string;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};

/** parseResponse: internal normalization helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** failureOutput: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const failureOutput = (modelId: string, modelInput: JsonRecord): JsonRecord => ({
  meta: {
    modelId,
    backendUrl: getBackendBaseUrl(),
    backendFieldValues: modelInput,
  },
});

const requestRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

/** runBinding: internal helper for schema composition, run, report, and feedback flow. @remarks Args: binding, fieldValues, fields, reports; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const runBinding = async (
  binding: SchemaRunBinding,
  fieldValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  reports: readonly ReportConfig[],
) => {
  const modelInput = applySchemaRunInputMapping(fieldValues, fields, binding);
  schemaRunDebug("transport.model.start", {
    binding,
    fieldValues,
    fields,
    modelInput,
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
    schemaRunDebug("transport.model.response", {
      modelId: binding.modelId,
      ok: response.ok,
      status: response.status,
      parsed,
    });
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
        normalized,
        reportCount: Array.isArray(normalized.raw.reports) ? normalized.raw.reports.length : 0,
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

/** reportKey: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportKey = (report: ReportConfig): string | undefined =>
  typeof report.id === "string" ? report.id : undefined;

/** findReportPayload: internal lookup helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const findReportPayload = (target: string, output: JsonRecord): JsonRecord | undefined => {
  const reports = Array.isArray(output.reports) ? output.reports.filter(isRecord) : [];
  const payload = reports.find((item) => String(item.mappedTo) === target);
  return payload;
};

/** buildReports: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const buildReports = (
  results: readonly Awaited<ReturnType<typeof runBinding>>[],
  bindings: readonly SchemaRunBinding[],
  reports: readonly ReportConfig[],
): { reports: JsonRecord[]; reportContextById: JsonRecord; skippedReportIds: string[] } => {
  return results.reduce<{
    reports: JsonRecord[];
    reportContextById: JsonRecord;
    skippedReportIds: string[];
  }>(
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
        const kind = typeof report.kind === "string" ? report.kind : "";
        const target = reportTargetForBinding(report, binding);
        schemaRunDebug("transport.reports.resolve", {
          result,
          binding,
          report,
          canonicalId,
          kind,
          target,
        });
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
          target,
          modelInput: result.modelInput,
          meta,
          raw: result.output,
        };
        if (reportPayload !== undefined) payload.reports.push(reportPayload);
        schemaRunDebug("transport.reports.mapped", {
          modelId: result.modelId,
          reportId: canonicalId,
          contextKey: reportContextKey(canonicalId),
          target,
          reportPayload,
          payload,
          hasPayload: reportPayload !== undefined,
        });
      });
      return payload;
    },
    { reports: [], reportContextById: {}, skippedReportIds: [] },
  );
};

/**
 * createSchemaRunTransport: creates a configured runtime object or schema object
 *
 * Purpose: fans out schema-run submissions to bound analyzer models and merges results.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: May create network-capable runtime objects; validation happens before requests where possible.
 */
export const createSchemaRunTransport = (
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
): Transport => ({
  async submit(request: SubmitRequest) {
    const reports = request.reports.map((report: ReportConfig, index: number) => {
      const mappedTo = report.mappedTo;
      if (mappedTo === undefined) throw new Error(`Schema report ${index + 1} falta mappedTo`);
      return { ...report, mappedTo };
    });
    const canonical = requestRecord(request.modelValues);
    const fieldValues = requestRecord(request.fieldValues);
    const inputData = requestRecord(request.displayValues);
    schemaRunDebug("transport.submit.start", {
      request,
      canonical,
      fieldValues,
      inputData,
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
      bindings.map((binding) => runBinding(binding, fieldValues, fields, reports)),
    );
    const built = buildReports(initialResults, bindings, reports);
    schemaRunDebug("transport.submit.after-models", {
      results: initialResults,
      built,
      statuses: initialResults.map((result) => ({
        modelId: result.modelId,
        status: result.status,
      })),
      reportCount: built.reports.length,
      contextKeys: Object.keys(built.reportContextById),
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
        results: initialResults,
        reports: built.reports,
        meta,
        reportContextById: built.reportContextById,
        [skippedReportIdsKey]: built.skippedReportIds,
      },
    };
  },
});
