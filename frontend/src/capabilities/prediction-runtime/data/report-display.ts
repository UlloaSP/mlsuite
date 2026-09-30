/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import { mappingLabels } from "@/capabilities/prediction-runtime/data/report-normalization";
import type { PredictionResultDto, SchemaVersionDto } from "@/shared/api/openapi.gen";

type SchemaVersion = Pick<SchemaVersionDto, "formSchema" | "bindings">;
type PredictionResult = Pick<PredictionResultDto, "modelId" | "output">;

export type SchemaDisplayReport = {
  id: string;
  order: number;
  label: string;
  kind: string;
  config: ReportConfig;
  payload?: JsonRecord;
  labels?: string[];
};

const reportsOf = (schema: unknown): ReportConfig[] =>
  isRecord(schema) && Array.isArray(schema.reports)
    ? (schema.reports.filter(isRecord) as ReportConfig[])
    : [];

const reportId = (report: ReportConfig): string | undefined =>
  typeof report.id === "string"
    ? report.id
    : typeof report.label === "string"
      ? report.label
      : undefined;

const reportLabel = (report: ReportConfig): string =>
  typeof report.label === "string" ? report.label : (reportId(report) ?? "Report");

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

const reportLabels = (report: ReportConfig): string[] =>
  Array.isArray((report as JsonRecord).labels)
    ? ((report as JsonRecord).labels as unknown[]).filter(
        (item): item is string => typeof item === "string",
      )
    : [];

const normalizeReportPayload = (
  report: ReportConfig,
  payload?: JsonRecord,
): JsonRecord | undefined => {
  if (!payload) return undefined;
  const labels = reportLabels(report);
  const payloadOnlyLabels = mappingLabels(payload.labels) ?? [];
  const payloadLabels =
    labels.length > 0
      ? labels
      : payloadOnlyLabels.length > 0
        ? payloadOnlyLabels
        : (mappingLabels(payload.mapping) ?? []);
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

const METADATA_KEYS = new Set(["endpoint", "modelId", "backendUrl", "status"]);

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

const isRenderablePayload = (report: ReportConfig, payload: JsonRecord | undefined): boolean => {
  if (payload === undefined) return false;
  const kind = typeof report.kind === "string" ? report.kind : "report";
  return isBuiltinReportKind(kind) || hasMeaningfulValue(payload);
};

export const getSchemaResultReports = (
  version: SchemaVersion,
  result: PredictionResult,
): SchemaDisplayReport[] => {
  const binding = version.bindings.find((item) => item.modelId === result.modelId);
  return reportsOf(version.formSchema).reduce<SchemaDisplayReport[]>((items, report, order) => {
    const id = reportId(report);
    const kind = typeof report.kind === "string" ? report.kind : "report";
    const target = reportTargetForBinding(report, binding);
    const rawPayload = target ? payloadFor(target, result.output, [id ?? ""]) : undefined;
    const payload = normalizeReportPayload(report, rawPayload);
    if (!id || !target || !isRenderablePayload(report, payload)) return items;
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
  }, []);
};
