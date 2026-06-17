/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import {
  isSkippedSchemaReportPayload,
  skippedSchemaReportPayload,
} from "./schema-report-plugin-context";
import { schemaRunDebug, schemaRunDebugError } from "./schema-run-debug";
import {
  readReportContext,
  reportTargetForBinding,
  reportContextKey,
} from "./schema-run-report-mapping";
import { isRecord, type JsonRecord } from "./shared";

export type SchemaRunBindingForReports = {
  modelId: string;
  modelName?: string;
};

export type SchemaRunModelResult = {
  modelId: string;
  modelInput?: unknown;
  output: JsonRecord;
  [key: string]: unknown;
};

const customReportByKind = (
  definitions: readonly CatalogReportDefinition[],
): Map<string, CatalogReportDefinition> => {
  const reports = new Map<string, CatalogReportDefinition>();
  definitions.forEach((definition) => {
    reports.set(definition.kind, definition);
  });
  return reports;
};

const targetForReport = (
  report: ReportConfig,
  context: JsonRecord,
  bindings: readonly SchemaRunBindingForReports[],
): string | undefined => {
  const binding = bindings.find((item) => item.modelId === context.modelId);
  return reportTargetForBinding(report, binding);
};

const hasBindingForReport = (
  report: ReportConfig,
  bindings: readonly SchemaRunBindingForReports[],
): boolean => bindings.some((binding) => reportTargetForBinding(report, binding) !== undefined);

const deriveReportContext = <TResult extends SchemaRunModelResult>(
  report: ReportConfig,
  bindings: readonly SchemaRunBindingForReports[],
  results: readonly TResult[],
): JsonRecord | null => {
  const binding = bindings.find((item) => reportTargetForBinding(report, item) !== undefined);
  if (!binding) return null;
  const result = results.find(
    (item) => item.modelId === binding.modelId && item.status === "SUCCESS",
  );
  if (!result || !isRecord(result.output)) return null;
  const meta = isRecord(result.output.meta) ? result.output.meta : {};
  return {
    modelId: result.modelId,
    modelInput: isRecord(result.modelInput) ? result.modelInput : {},
    meta,
    raw: result.output,
  };
};

const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const patchResultReportPayload = <TResult extends SchemaRunModelResult>(
  result: TResult,
  reportId: string,
  target: string,
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
        [reportContextKey(reportId)]: payload,
        [reportId]: payload,
        [target]: payload,
      },
    },
  };
};

const storeReportPayload = (
  reports: JsonRecord,
  reportId: string,
  target: string,
  payload: unknown,
) => {
  const key = reportContextKey(reportId);
  reports[key] = payload;
  reports[reportId] = payload;
  reports[target] = payload;
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
  schemaRunDebug("custom-report-fetch.start", {
    availableKinds: Array.from(byKind.keys()),
    reports: reports.map((report) => ({ id: report.id, kind: report.kind })),
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
      if (built.reports[key] !== undefined) {
        schemaRunDebug("custom-report-fetch.skip-has-payload", { id, key });
        return;
      }
      const definition = byKind.get(report.kind);
      if (!definition) {
        schemaRunDebug("custom-report-fetch.skip-no-definition", {
          id,
          kind: report.kind,
          availableKinds: Array.from(byKind.keys()),
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
        deriveReportContext(report, bindings, nextResults) ??
        {};
      schemaRunDebug("custom-report-fetch.context", {
        id,
        key,
        kind: report.kind,
        modelId: context.modelId,
        hasMeta: isRecord(context.meta),
        hasModelInput: isRecord(context.modelInput),
      });
      const modelId = contextId(context.modelId);
      if (!modelId) {
        if (hasBindingForReport(report, bindings)) {
          schemaRunDebug("custom-report-fetch.skip-mapped-no-success-context", { id, key });
          built.reports[key] = skippedSchemaReportPayload;
          return;
        }
        throw new Error(`Schema report "${id}" is not bound to a model context.`);
      }
      const normalizedContext = { ...context, modelId };
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
        return;
      }
      if (payload === undefined || isSkippedSchemaReportPayload(payload)) {
        schemaRunDebug("custom-report-fetch.skip-empty-payload", { id, key, payload });
        return;
      }
      const target = targetForReport(report, context, bindings);
      if (!target) throw new Error(`Schema report "${id}" falta mappedTo`);
      storeReportPayload(built.reports, id, target, payload);
      schemaRunDebug("custom-report-fetch.success", {
        id,
        key,
        target,
        modelId,
        payloadKeys: isRecord(payload) ? Object.keys(payload) : typeof payload,
      });
      nextResults = nextResults.map((result) =>
        contextId(result.modelId) === modelId
          ? patchResultReportPayload(result, id, target, payload)
          : result,
      );
    }),
  );
  return nextResults;
};
