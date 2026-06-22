/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportDescriptorContext } from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import { readReportContext } from "../../mlform/schema-run-report-mapping";
import { isRecord } from "../../mlform/shared";

type SchemaReportContext = {
  modelId?: unknown;
  modelInput?: unknown;
  meta?: unknown;
  raw?: unknown;
};

const modelIdString = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

/**
 * skippedSchemaReportPayload: performs the exported transformation for this algorithm.
 *
 * Purpose: patches schema report plugin fetch/render contexts with model-specific data.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const skippedSchemaReportPayload = { __mlsuiteSchemaReportSkipped: true };
/**
 * skippedReportIdsKey: performs the exported transformation for this algorithm.
 *
 * Purpose: patches schema report plugin fetch/render contexts with model-specific data.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const skippedReportIdsKey = "skippedReportIds";

/**
 * isSkippedSchemaReportPayload: returns a boolean guard/result for the requested predicate
 *
 * Purpose: patches schema report plugin fetch/render contexts with model-specific data.
 * @returns Boolean result for the domain predicate.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const isSkippedSchemaReportPayload = (value: unknown): boolean =>
  isRecord(value) && value.__mlsuiteSchemaReportSkipped === true;

/** getReportContext: internal lookup helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** getRequestReportContext: internal lookup helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getRequestReportContext = (
  request: unknown,
  reportId: string,
): SchemaReportContext | null => {
  if (!isRecord(request)) return null;
  const raw = isRecord(request.raw) ? request.raw : {};
  const meta = isRecord(request.meta) ? request.meta : {};
  return (
    readReportContext(raw.reportContextById, reportId) ??
    readReportContext(meta.reportContextById, reportId) ??
    null
  );
};

/** hasSchemaReportContextMap: internal constant/cache for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const hasSchemaReportContextMap = (request: unknown): boolean => {
  if (!isRecord(request)) return false;
  const raw = isRecord(request.raw) ? request.raw : {};
  const meta = isRecord(request.meta) ? request.meta : {};
  return isRecord(raw.reportContextById) || isRecord(meta.reportContextById);
};

/**
 * patchSchemaReportRequest: returns a copy patched with schema-specific context
 *
 * Purpose: patches schema report plugin fetch/render contexts with model-specific data.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
      modelId: modelIdString(reportContext.modelId),
      backendUrl: reportMeta.backendUrl,
      backendFieldValues: modelInput,
    },
    raw: isRecord(reportContext.raw) ? reportContext.raw : request.raw,
    fieldValues: modelInput,
    serializedFieldValues: modelInput,
    serializedValues: modelInput,
  } as T;
};

/**
 * patchSchemaReportContext: returns a copy patched with schema-specific context
 *
 * Purpose: patches schema report plugin fetch/render contexts with model-specific data.
 * @param fetchFactory - Input consumed by patchSchemaReportContext; uses the patches schema report plugin fetch/render contexts with model-specific data contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
        modelId: modelIdString(reportContext.modelId),
        backendUrl: reportMeta.backendUrl,
        backendFieldValues: reportMeta.backendFieldValues,
      },
      raw: isRecord(reportContext.raw) ? reportContext.raw : result.raw,
      fieldValues: modelInput,
      serializedFieldValues: modelInput,
    },
  };
};

/** reportIdFromFetchContext: internal helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportIdFromFetchContext = (value: unknown): string => {
  if (!isRecord(value)) return "";
  if (typeof value.reportId === "string") return value.reportId;
  if (isRecord(value.config) && typeof value.config.id === "string") return value.config.id;
  if (isRecord(value.report) && typeof value.report.id === "string") return value.report.id;
  return "";
};

/** wrapFetchFactory: internal helper for plugin catalog/runtime source handling. @remarks Args: fetchFactory; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const wrapFetchFactory = (
  fetchFactory: NonNullable<CatalogReportDefinition["definition"]["fetch"]>,
) =>
  ((args: never) => {
    const fetcher = fetchFactory(args);
    if (!fetcher || typeof fetcher.submit !== "function") return fetcher;
    const reportId = reportIdFromFetchContext(args);
    return {
      ...fetcher,
      submit: async (request: never) => {
        if (hasSchemaReportContextMap(request) && !getRequestReportContext(request, reportId)) {
          return skippedSchemaReportPayload;
        }
        return fetcher.submit(patchSchemaReportRequest(request, reportId));
      },
    };
  }) as CatalogReportDefinition["definition"]["fetch"];

type SchemaLike = CatalogReportDefinition["definition"]["schema"];

const schemaRunKeys = ["id", "label", "mappedTo", "displayKey", "source"] as const;

const mergeSchemaRunConfig = (parsed: unknown, source: unknown): unknown => {
  if (!isRecord(parsed) || !isRecord(source)) return parsed;
  const next: Record<string, unknown> = { ...parsed };
  schemaRunKeys.forEach((key) => {
    if (source[key] !== undefined) next[key] = source[key];
  });
  return next;
};

const preserveSchemaRunConfig = (schema: SchemaLike): SchemaLike =>
  ({
    ...schema,
    parse(value: unknown) {
      return mergeSchemaRunConfig(schema.parse(value), value);
    },
    safeParse(value: unknown) {
      const result = schema.safeParse(value);
      return result.success
        ? { ...result, data: mergeSchemaRunConfig(result.data, value) }
        : result;
    },
  }) as SchemaLike;

/**
 * wrapSchemaReportDefinitions: wraps definitions to preserve schema-specific behavior
 *
 * Purpose: patches schema report plugin fetch/render contexts with model-specific data.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const wrapSchemaReportDefinitions = (
  definitions: readonly CatalogReportDefinition[],
): readonly CatalogReportDefinition[] =>
  definitions.map((definition) => {
    const topFetch = definition.definition.fetch;
    const innerFetch = definition.definition.definition.fetch;
    const wrappedTopFetch = topFetch ? wrapFetchFactory(topFetch) : undefined;
    const wrappedInnerFetch = innerFetch ? wrapFetchFactory(innerFetch) : wrappedTopFetch;
    const wrapped = {
      ...definition,
      definition: {
        ...definition.definition,
        schema: preserveSchemaRunConfig(definition.definition.schema),
        fetch: wrappedTopFetch,
        definition: {
          ...definition.definition.definition,
          schema: preserveSchemaRunConfig(definition.definition.definition.schema),
          fetch: wrappedInnerFetch,
        },
        describe:
          definition.definition.describe === undefined
            ? undefined
            : (config: ReportConfig, context: ReportDescriptorContext) => {
                if (isSkippedSchemaReportPayload(context.payload)) return null;
                return (
                  definition.definition.describe?.(
                    config as never,
                    patchSchemaReportContext(context),
                  ) ?? null
                );
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
