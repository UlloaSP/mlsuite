/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { isBuiltinReportKind } from "../../mlform/builtin-registry";
import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import { isSkippedSchemaReportPayload } from "../report-plugin-context";
import { reportTargetForBinding } from "../../mlform/schema-run-report-mapping";
import type { PredictionResultDto, SchemaVersionDto } from "../../../api/schemas/dtos";
import { schemaRunDebug } from "../run-debug";

/**
 * SchemaDisplayReport: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: normalizes schema result reports for display/review/export.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type SchemaDisplayReport = {
  id: string;
  order: number;
  label: string;
  kind: string;
  config: ReportConfig;
  payload?: JsonRecord;
  labels?: string[];
};

/** reportsOf: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportsOf = (schema: unknown): ReportConfig[] =>
  isRecord(schema) && Array.isArray(schema.reports)
    ? (schema.reports.filter(isRecord) as ReportConfig[])
    : [];

const sameId = (left: unknown, right: unknown): boolean =>
  (typeof left === "string" || typeof left === "number") &&
  (typeof right === "string" || typeof right === "number") &&
  String(left) === String(right);

/** reportId: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportId = (report: ReportConfig): string | undefined =>
  typeof report.id === "string"
    ? report.id
    : typeof report.label === "string"
      ? report.label
      : undefined;

/** reportLabel: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportLabel = (report: ReportConfig): string =>
  typeof report.label === "string" ? report.label : (reportId(report) ?? "Report");

/** payloadFor: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const payloadFor = (
  target: string,
  output: JsonRecord,
  aliases: readonly string[] = [],
): JsonRecord | undefined => {
  const reports = Array.isArray(output.reports) ? output.reports.filter(isRecord) : [];
  const match = reports.find(
    (report) =>
      String(report.mappedTo) === target ||
      aliases.some((alias) => String(report.id) === alias || String(report.mappedTo) === alias),
  );
  if (!match) return undefined;
  const payload = "payload" in match ? match.payload : match;
  return isRecord(payload) ? payload : { value: payload };
};

/** reportLabels: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportLabels = (report: ReportConfig): string[] =>
  Array.isArray((report as JsonRecord).labels)
    ? ((report as JsonRecord).labels as unknown[]).filter(
        (item): item is string => typeof item === "string",
      )
    : [];

const mappingLabels = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!isRecord(value)) return [];
  return Object.entries(value)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, label]) => label)
    .filter((label): label is string => typeof label === "string");
};

/** normalizeReportPayload: internal normalization helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const normalizeReportPayload = (
  report: ReportConfig,
  payload?: JsonRecord,
): JsonRecord | undefined => {
  if (!payload) return undefined;
  const labels = reportLabels(report);
  const payloadOnlyLabels = mappingLabels(payload.labels);
  const payloadLabels =
    labels.length > 0
      ? labels
      : payloadOnlyLabels.length > 0
        ? payloadOnlyLabels
        : mappingLabels(payload.mapping);
  if (payloadLabels.length > 0) payload = { ...payload, labels: payloadLabels };
  if (payloadLabels.length === 0) return payload;
  const prediction = payload.prediction;
  if (typeof prediction === "string" && payloadLabels.includes(prediction)) return payload;
  const index =
    typeof prediction === "number"
      ? prediction
      : typeof prediction === "string" && /^\d+$/.test(prediction)
        ? Number(prediction)
        : -1;
  return {
    ...payload,
    labels: payloadLabels,
    prediction: payloadLabels[index] ?? prediction,
  };
};

/** METADATA_KEYS: internal constant/cache for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const METADATA_KEYS = new Set(["endpoint", "modelId", "backendUrl", "status"]);

/** hasMeaningfulValue: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => !METADATA_KEYS.has(key) && hasMeaningfulValue(nested),
  );
};

/** isRenderablePayload: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRenderablePayload = (report: ReportConfig, payload: JsonRecord | undefined): boolean => {
  if (payload === undefined || isSkippedSchemaReportPayload(payload)) return false;
  const kind = typeof report.kind === "string" ? report.kind : "report";
  return isBuiltinReportKind(kind) || hasMeaningfulValue(payload);
};

/**
 * getSchemaResultReports: extracts a derived value without mutating input
 *
 * Purpose: normalizes schema result reports for display/review/export.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getSchemaResultReports = (
  version: SchemaVersionDto,
  result: Pick<PredictionResultDto, "modelId" | "output">,
): SchemaDisplayReport[] => {
  const binding = version.bindings.find((item) => sameId(item.modelId, result.modelId));
  schemaRunDebug("display-reports.start", {
    versionId: version.id,
    result,
    binding,
    schemaReports: reportsOf(version.formSchema),
  });
  const items = reportsOf(version.formSchema).reduce<SchemaDisplayReport[]>(
    (items, report, order) => {
      const id = reportId(report);
      const kind = typeof report.kind === "string" ? report.kind : "report";
      const target = reportTargetForBinding(report, binding);
      const rawPayload = target ? payloadFor(target, result.output, [id ?? ""]) : undefined;
      const payload = normalizeReportPayload(report, rawPayload);
      const renderable = isRenderablePayload(report, payload);
      schemaRunDebug("display-reports.item", {
        report,
        order,
        id,
        kind,
        target,
        rawPayload,
        payload,
        renderable,
      });
      if (!id || !target || !renderable) return items;
      items.push({
        id,
        order,
        label: reportLabel(report),
        kind,
        config: report,
        labels: reportLabels(report),
        payload,
      });
      return items;
    },
    [],
  );
  schemaRunDebug("display-reports.done", { modelId: result.modelId, items });
  return items;
};
