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
import { mappingSourceForReport, readReportContext, reportContextKey } from "./schema-run-report-mapping";
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
): string => {
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

const deriveReportContext = <TResult extends SchemaRunModelResult>(
  reportId: string,
  bindings: readonly SchemaRunBindingForReports[],
  results: readonly TResult[],
): JsonRecord | null => {
  const binding = bindings.find(
    (item) => mappingSourceForReport(item.outputMapping, reportId) !== undefined,
  );
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
    modelInput: isRecord(result.modelInput) ? result.modelInput : {},
    meta,
    raw: result.output,
  };
};

const patchResultReportPayload = <TResult extends SchemaRunModelResult>(
  result: TResult,
  reportId: string,
  source: string,
  payload: unknown,
): TResult => {
  const output = isRecord(result.output) ? result.output : {};
  const reports = isRecord(output.reports) ? output.reports : {};
  return {
    ...result,
    output: {
      ...output,
      reports: { ...reports, [reportId]: payload, [source]: payload },
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
}: {
  request: SubmitRequest;
  reports: readonly ReportConfig[];
  built: { reports: JsonRecord; reportContextById: JsonRecord };
  results: readonly TResult[];
  bindings: readonly SchemaRunBindingForReports[];
  definitions: readonly CatalogReportDefinition[];
}): Promise<readonly TResult[]> => {
  const byKind = customReportByKind(definitions);
  let nextResults = [...results];
  await Promise.all(
    reports.map(async (report) => {
      const id = typeof report.id === "string" ? report.id : undefined;
      const key = id ? reportContextKey(id) : undefined;
      if (!id || !key || built.reports[key] !== undefined) return;
      const definition = byKind.get(report.kind);
      const fetchFactory =
        definition?.definition.definition.fetch ?? definition?.definition.fetch;
      const fetcher = fetchFactory?.({ config: report as never, reportId: id });
      if (!fetcher) return;
      const context = readReportContext(built.reportContextById, id) ??
        deriveReportContext(id, bindings, nextResults) ??
        {};
      if (typeof context.modelId !== "string") {
        if (hasBindingForReport(id, bindings)) {
          built.reports[key] = skippedSchemaReportPayload;
          return;
        }
        throw new Error(`Schema report "${id}" is not bound to a model context.`);
      }
      built.reportContextById[key] = context;
      let payload: unknown;
      const contextMeta = isRecord(context.meta) ? context.meta : {};
      const modelInput = isRecord(context.modelInput) ? context.modelInput : {};
      try {
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
            modelId: context.modelId,
            backendFieldValues: contextMeta.backendFieldValues ?? modelInput,
            schemaRun: true,
            reportContextById: built.reportContextById,
          },
          raw: { results: nextResults, reports: built.reports, reportContextById: built.reportContextById },
          signal: request.signal,
        });
      } catch {
        built.reports[key] = skippedSchemaReportPayload;
        return;
      }
      if (payload === undefined || isSkippedSchemaReportPayload(payload)) return;
      const source = sourceForReport(id, context, bindings);
      built.reports[key] = payload;
      nextResults = nextResults.map((result) =>
        result.modelId === context.modelId && result.signatureId === context.signatureId
          ? patchResultReportPayload(result, id, source, payload)
          : result,
      );
    }),
  );
  return nextResults;
};
