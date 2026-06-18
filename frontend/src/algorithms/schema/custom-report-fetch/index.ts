/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest } from "mlform/runtime";
import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import { isSkippedSchemaReportPayload } from "../report-plugin-context";
import { schemaRunDebug, schemaRunDebugError } from "../run-debug";
import {
  readReportContext,
  reportContextKey,
  reportTargetForBinding,
} from "../../mlform/schema-run-report-mapping";
import { isRecord, type JsonRecord } from "../../mlform/shared";

type Binding = {
  modelId: string;
  modelName?: string;
};

type ModelResult = {
  modelId: string;
  modelInput?: unknown;
  output: JsonRecord;
  status?: string;
  [key: string]: unknown;
};

const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const reportId = (report: ReportConfig): string | undefined =>
  typeof report.id === "string" ? report.id : undefined;

const reportTarget = (
  report: ReportConfig,
  context: JsonRecord,
  bindings: readonly Binding[],
): string | undefined => {
  const modelId = contextId(context.modelId);
  const binding = bindings.find((item) => contextId(item.modelId) === modelId);
  return reportTargetForBinding(report, binding);
};

const successfulContext = (
  report: ReportConfig,
  bindings: readonly Binding[],
  results: readonly ModelResult[],
): JsonRecord | null => {
  const binding = bindings.find((item) => reportTargetForBinding(report, item) !== undefined);
  const result = binding
    ? results.find((item) => item.modelId === binding.modelId && item.status === "SUCCESS")
    : undefined;
  if (!result) return null;
  return {
    modelId: result.modelId,
    modelInput: isRecord(result.modelInput) ? result.modelInput : {},
    meta: isRecord(result.output.meta) ? result.output.meta : {},
    raw: result.output,
  };
};

const storePayload = (
  reports: JsonRecord,
  id: string,
  target: string,
  payload: unknown,
): void => {
  reports[reportContextKey(id)] = payload;
  reports[id] = payload;
  reports[target] = payload;
};

const patchResult = (
  result: ModelResult,
  id: string,
  target: string,
  payload: unknown,
): ModelResult => {
  const reports = isRecord(result.output.reports) ? result.output.reports : {};
  return {
    ...result,
    output: {
      ...result.output,
      reports: { ...reports, [reportContextKey(id)]: payload, [id]: payload, [target]: payload },
    },
  };
};

export const fetchSchemaCustomReports = async ({
  request,
  reports,
  built,
  results,
  bindings,
  definitions,
}: {
  request: SubmitRequest;
  reports: readonly ReportConfig[];
  built: { reports: JsonRecord; reportContextById: JsonRecord; skippedReportIds: string[] };
  results: readonly ModelResult[];
  bindings: readonly Binding[];
  definitions: readonly CatalogReportDefinition[];
}): Promise<readonly ModelResult[]> => {
  const definitionsByKind = new Map(definitions.map((definition) => [definition.kind, definition]));
  let nextResults = [...results];
  await Promise.all(
    reports.map(async (report) => {
      const id = reportId(report);
      if (!id || built.reports[reportContextKey(id)] !== undefined) return;
      const definition = definitionsByKind.get(report.kind);
      const fetchFactory = definition?.definition.definition.fetch ?? definition?.definition.fetch;
      const fetcher = fetchFactory?.({ config: report as never, reportId: id });
      if (!fetcher) return;

      const key = reportContextKey(id);
      const context =
        readReportContext(built.reportContextById, id) ??
        successfulContext(report, bindings, nextResults);
      const modelId = contextId(context?.modelId);
      if (!context || !modelId) {
        if (bindings.some((binding) => reportTargetForBinding(report, binding) !== undefined)) {
          built.skippedReportIds.push(key);
          return;
        }
        throw new Error(`Schema report "${id}" is not bound to a model context.`);
      }

      const meta = isRecord(context.meta) ? context.meta : {};
      const modelInput = isRecord(context.modelInput) ? context.modelInput : {};
      built.reportContextById[key] = { ...context, modelId };
      try {
        schemaRunDebug("custom-report-fetch.call", { id, kind: report.kind, modelId });
        const payload = await fetcher.submit({
          reportId: id,
          values: modelInput,
          fieldValues: modelInput,
          serializedValues: modelInput,
          serializedFieldValues: modelInput,
          reports: built.reports,
          meta: {
            backendUrl: getBackendBaseUrl(),
            ...meta,
            modelId,
            backendFieldValues: modelInput,
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
        if (payload === undefined || isSkippedSchemaReportPayload(payload)) return;
        const target = reportTarget(report, context, bindings);
        if (!target) throw new Error(`Schema report "${id}" falta mappedTo`);
        storePayload(built.reports, id, target, payload);
        nextResults = nextResults.map((result) =>
          contextId(result.modelId) === modelId ? patchResult(result, id, target, payload) : result,
        );
      } catch (error) {
        schemaRunDebugError("custom-report-fetch.error", error, { id, kind: report.kind, modelId });
        built.skippedReportIds.push(key);
      }
    }),
  );
  return nextResults;
};
