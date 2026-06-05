/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportDescriptorContext } from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import type { CatalogReportDefinition } from "./custom-report";
import { readReportContext } from "./schema-run-report-mapping";
import { isRecord } from "./shared";

type SchemaReportContext = {
  modelId?: unknown;
  signatureId?: unknown;
  modelInput?: unknown;
  meta?: unknown;
  raw?: unknown;
};

export const skippedSchemaReportPayload = { __mlsuiteSchemaReportSkipped: true };

export const isSkippedSchemaReportPayload = (value: unknown): boolean =>
  isRecord(value) && value.__mlsuiteSchemaReportSkipped === true;

const getReportContext = (context: ReportDescriptorContext): SchemaReportContext | null => {
  const result = context.result;
  if (!isRecord(result)) return null;
  const raw = isRecord(result.raw) ? result.raw : {};
  const rawCandidate = readReportContext(raw.reportContextById, context.reportId);
  const metaCandidate = isRecord(result.meta)
    ? readReportContext(result.meta.reportContextById, context.reportId)
    : undefined;
  return rawCandidate ?? metaCandidate ?? null;
};

const getRequestReportContext = (
  request: unknown,
  reportId: string,
): SchemaReportContext | null => {
  if (!isRecord(request)) return null;
  const raw = isRecord(request.raw) ? request.raw : {};
  const meta = isRecord(request.meta) ? request.meta : {};
  return readReportContext(raw.reportContextById, reportId) ??
    readReportContext(meta.reportContextById, reportId) ??
    null;
};

export const patchSchemaReportRequest = <T>(request: T, reportId: string): T => {
  if (!isRecord(request)) return request;
  const reportContext = getRequestReportContext(request, reportId);
  if (!reportContext) return request;
  const reportMeta = isRecord(reportContext.meta) ? reportContext.meta : {};
  const modelInput = isRecord(reportContext.modelInput) ? reportContext.modelInput : {};
  return {
    ...request,
    meta: {
      ...(isRecord(request.meta) ? request.meta : {}),
      ...reportMeta,
      modelId: reportContext.modelId,
      backendUrl: reportMeta.backendUrl,
      backendFieldValues: reportMeta.backendFieldValues ?? modelInput,
    },
    raw: isRecord(reportContext.raw) ? reportContext.raw : request.raw,
    fieldValues: modelInput,
    serializedFieldValues: modelInput,
    serializedValues: modelInput,
  } as T;
};

export const patchSchemaReportContext = (
  context: ReportDescriptorContext,
): ReportDescriptorContext => {
  const reportContext = getReportContext(context);
  const result = isRecord(context.result) ? context.result : null;
  if (!reportContext || !result) return context;

  const reportMeta = isRecord(reportContext.meta) ? reportContext.meta : {};
  const modelInput = isRecord(reportContext.modelInput) ? reportContext.modelInput : {};
  return {
    ...context,
    result: {
      ...result,
      meta: {
        ...(isRecord(result.meta) ? result.meta : {}),
        ...reportMeta,
        modelId: reportContext.modelId,
        backendUrl: reportMeta.backendUrl,
        backendFieldValues: reportMeta.backendFieldValues,
      },
      raw: isRecord(reportContext.raw) ? reportContext.raw : result.raw,
      fieldValues: modelInput,
      serializedFieldValues: modelInput,
    },
  };
};

const reportIdFromFetchContext = (value: unknown): string => {
  if (!isRecord(value)) return "";
  if (typeof value.reportId === "string") return value.reportId;
  if (isRecord(value.config) && typeof value.config.id === "string") return value.config.id;
  if (isRecord(value.report) && typeof value.report.id === "string") return value.report.id;
  return "";
};

const wrapFetchFactory = (
  fetchFactory: NonNullable<CatalogReportDefinition["definition"]["fetch"]>,
) =>
  ((args: never) => {
    const fetcher = fetchFactory(args);
    if (!fetcher || typeof fetcher.submit !== "function") return fetcher;
    const reportId = reportIdFromFetchContext(args);
    return {
      ...fetcher,
      submit: async (request: never) => fetcher.submit(patchSchemaReportRequest(request, reportId)),
    };
  }) as CatalogReportDefinition["definition"]["fetch"];

export const wrapSchemaReportDefinitions = (
  definitions: readonly CatalogReportDefinition[],
): readonly CatalogReportDefinition[] =>
  definitions.map((definition) => {
    const topFetch = definition.definition.fetch;
    const innerFetch = definition.definition.definition.fetch;
    const wrappedTopFetch = topFetch ? wrapFetchFactory(topFetch) : undefined;
    const wrappedInnerFetch = innerFetch
      ? wrapFetchFactory(innerFetch)
      : wrappedTopFetch;
    const wrapped = {
      ...definition,
      definition: {
        ...definition.definition,
        fetch: wrappedTopFetch,
        definition: {
          ...definition.definition.definition,
          fetch: wrappedInnerFetch,
        },
        describe:
          definition.definition.describe === undefined
            ? undefined
            : (config: ReportConfig, context: ReportDescriptorContext) => {
                if (isSkippedSchemaReportPayload(context.payload)) return null;
                return definition.definition.describe?.(config as never, patchSchemaReportContext(context)) ??
                  null;
              },
        presenter: {
          ...definition.definition.presenter,
          describe: (config: ReportConfig, context: ReportDescriptorContext) => {
            if (isSkippedSchemaReportPayload(context.payload)) return null;
            return definition.definition.presenter.describe(
              config as never,
              patchSchemaReportContext(context),
            );
          },
        },
      },
    };
    return wrapped as CatalogReportDefinition;
  });
