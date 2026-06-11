/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import type { CatalogReportDefinition } from "./custom-report";
import {
  isSkippedSchemaReportPayload,
  skippedSchemaReportPayload,
} from "./schema-report-plugin-context";
import { schemaRunDebug, schemaRunDebugError } from "./schema-run-debug";
import {
  mappingSourceForReport,
  readReportContext,
  reportContextKey,
} from "./schema-run-report-mapping";
import { runtimeUsageForReport, type SchemaRunReportUsage } from "./schema-run-report-usages";
import { isRecord, type JsonRecord } from "./shared";

export type SchemaRunBindingForReports = {
  modelId: string;
  signatureId: string;
  outputMapping?: JsonRecord;
};

export type SchemaRunModelResult = {
  modelId: string;
  signatureId: string;
  modelInput?: unknown;
  output: JsonRecord;
  [key: string]: unknown;
};

const customReportByKind = (
  definitions: readonly CatalogReportDefinition[],
): Map<string, CatalogReportDefinition> => {
  const reports = new Map<string, CatalogReportDefinition>();
  definitions.forEach((definition) => {
    if (definition.active) reports.set(definition.kind, definition);
  });
  return reports;
};

const sourceForReport = (
  reportId: string,
  context: JsonRecord,
  bindings: readonly SchemaRunBindingForReports[],
  usage?: SchemaRunReportUsage,
): string => {
  if (usage) return usage.source;
  const binding = bindings.find(
    (item) => item.modelId === context.modelId && item.signatureId === context.signatureId,
  );
  return mappingSourceForReport(binding?.outputMapping, reportId) ?? reportId;
};

const hasBindingForReport = (
  reportId: string,
  bindings: readonly SchemaRunBindingForReports[],
): boolean =>
  bindings.some((binding) => mappingSourceForReport(binding.outputMapping, reportId) !== undefined);

const isSharedCanonicalReport = (
  canonicalReportId: string,
  usages: readonly SchemaRunReportUsage[],
): boolean => usages.filter((usage) => usage.canonicalReportId === canonicalReportId).length > 1;

const deriveReportContext = <TResult extends SchemaRunModelResult>(
  reportId: string,
  bindings: readonly SchemaRunBindingForReports[],
  results: readonly TResult[],
  usage?: SchemaRunReportUsage,
): JsonRecord | null => {
  const binding =
    usage ??
    bindings.find((item) => mappingSourceForReport(item.outputMapping, reportId) !== undefined);
  if (!binding) return null;
  const result = results.find(
    (item) =>
      item.modelId === binding.modelId &&
      item.signatureId === binding.signatureId &&
      item.status === "SUCCESS",
  );
  if (!result || !isRecord(result.output)) return null;
  const meta = isRecord(result.output.meta) ? result.output.meta : {};
  return {
    modelId: result.modelId,
    signatureId: result.signatureId,
    canonicalReportId: usage?.canonicalReportId ?? reportId,
    source: usage?.source,
    modelInput: isRecord(result.modelInput) ? result.modelInput : {},
    meta,
    raw: result.output,
  };
};

const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const patchResultReportPayload = <TResult extends SchemaRunModelResult>(
  result: TResult,
  runtimeId: string,
  canonicalReportId: string,
  source: string,
  payload: unknown,
): TResult => {
  const output = isRecord(result.output) ? result.output : {};
  const reports = isRecord(output.reports) ? output.reports : {};
  return {
    ...result,
    output: {
      ...output,
      reports: {
        ...reports,
        [runtimeId]: payload,
        [canonicalReportId]: payload,
        [source]: payload,
      },
    },
  };
};

export const fetchSchemaCustomReports = async <TResult extends SchemaRunModelResult>({
  request,
  reports,
  built,
  results,
  bindings,
  definitions,
  reportUsages = [],
}: {
  request: SubmitRequest;
  reports: readonly ReportConfig[];
  built: { reports: JsonRecord; reportContextById: JsonRecord };
  results: readonly TResult[];
  bindings: readonly SchemaRunBindingForReports[];
  definitions: readonly CatalogReportDefinition[];
  reportUsages?: readonly SchemaRunReportUsage[];
}): Promise<readonly TResult[]> => {
  const byKind = customReportByKind(definitions);
  let nextResults = [...results];
  schemaRunDebug("custom-report-fetch.start", {
    activeKinds: Array.from(byKind.keys()),
    reports: reports.map((report) => ({ id: report.id, kind: report.kind, source: report.source })),
    initialReportKeys: Object.keys(built.reports),
    initialContextKeys: Object.keys(built.reportContextById),
  });
  await Promise.all(
    reports.map(async (report) => {
      const id = typeof report.id === "string" ? report.id : undefined;
      const key = id ? reportContextKey(id) : undefined;
      if (!id || !key) {
        schemaRunDebug("custom-report-fetch.skip-no-id", { report });
        return;
      }
      const usage = runtimeUsageForReport(report, reportUsages);
      const canonicalReportId = usage?.canonicalReportId ?? id;
      if (built.reports[key] !== undefined) {
        schemaRunDebug("custom-report-fetch.skip-has-payload", { id, key });
        return;
      }
      const definition = byKind.get(report.kind);
      if (!definition) {
        schemaRunDebug("custom-report-fetch.skip-no-definition", {
          id,
          kind: report.kind,
          activeKinds: Array.from(byKind.keys()),
        });
        return;
      }
      const fetchFactory = definition?.definition.definition.fetch ?? definition?.definition.fetch;
      const fetcher = fetchFactory?.({ config: report as never, reportId: id });
      if (!fetcher) {
        schemaRunDebug("custom-report-fetch.skip-no-fetcher", { id, kind: report.kind });
        return;
      }
      const context =
        readReportContext(built.reportContextById, id) ??
        deriveReportContext(canonicalReportId, bindings, nextResults, usage) ??
        {};
      schemaRunDebug("custom-report-fetch.context", {
        id,
        key,
        kind: report.kind,
        modelId: context.modelId,
        signatureId: context.signatureId,
        hasMeta: isRecord(context.meta),
        hasModelInput: isRecord(context.modelInput),
      });
      const modelId = contextId(context.modelId);
      const signatureId = contextId(context.signatureId);
      if (!modelId) {
        if (hasBindingForReport(canonicalReportId, bindings)) {
          schemaRunDebug("custom-report-fetch.skip-mapped-no-success-context", { id, key });
          built.reports[key] = skippedSchemaReportPayload;
          if (!isSharedCanonicalReport(canonicalReportId, reportUsages)) {
            built.reports[reportContextKey(canonicalReportId)] = skippedSchemaReportPayload;
          }
          return;
        }
        throw new Error(`Schema report "${id}" is not bound to a model context.`);
      }
      const normalizedContext = { ...context, modelId, signatureId };
      built.reportContextById[key] = normalizedContext;
      let payload: unknown;
      const contextMeta = isRecord(context.meta) ? context.meta : {};
      const modelInput = isRecord(context.modelInput) ? context.modelInput : {};
      try {
        schemaRunDebug("custom-report-fetch.call", {
          id,
          kind: report.kind,
          modelId,
          backendUrl: contextMeta.backendUrl ?? getBackendBaseUrl(),
          modelInputKeys: Object.keys(modelInput),
        });
        payload = await fetcher.submit({
          reportId: id,
          values: request.values,
          fieldValues: request.fieldValues,
          serializedValues: request.serializedValues,
          serializedFieldValues: request.serializedFieldValues,
          reports: built.reports,
          meta: {
            backendUrl: getBackendBaseUrl(),
            ...contextMeta,
            modelId,
            backendFieldValues: contextMeta.backendFieldValues ?? modelInput,
            schemaRun: true,
            reportContextById: built.reportContextById,
          },
          raw: {
            results: nextResults,
            reports: built.reports,
            reportContextById: built.reportContextById,
          },
          signal: request.signal,
        });
      } catch (error) {
        schemaRunDebugError("custom-report-fetch.error", error, {
          id,
          kind: report.kind,
          modelId,
        });
        built.reports[key] = skippedSchemaReportPayload;
        if (!isSharedCanonicalReport(canonicalReportId, reportUsages)) {
          built.reports[reportContextKey(canonicalReportId)] = skippedSchemaReportPayload;
        }
        return;
      }
      if (payload === undefined || isSkippedSchemaReportPayload(payload)) {
        schemaRunDebug("custom-report-fetch.skip-empty-payload", { id, key, payload });
        return;
      }
      const source = sourceForReport(canonicalReportId, context, bindings, usage);
      built.reports[key] = payload;
      if (!isSharedCanonicalReport(canonicalReportId, reportUsages)) {
        built.reports[reportContextKey(canonicalReportId)] = payload;
      }
      schemaRunDebug("custom-report-fetch.success", {
        id,
        key,
        source,
        modelId,
        payloadKeys: isRecord(payload) ? Object.keys(payload) : typeof payload,
      });
      nextResults = nextResults.map((result) =>
        contextId(result.modelId) === modelId && contextId(result.signatureId) === signatureId
          ? patchResultReportPayload(result, id, canonicalReportId, source, payload)
          : result,
      );
    }),
  );
  return nextResults;
};
