/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import type { ReportConfig } from "mlform/runtime";
import { isBuiltinReportKind } from "../../mlform/builtin-registry";
import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import { isSkippedSchemaReportPayload } from "../report-plugin-context";
import { reportTargetForBinding } from "../../mlform/schema-run-report-mapping";
import type { PredictionResultDto, SchemaVersionDto } from "../../../schemas/types";

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
  if (!isRecord(output.reports)) return undefined;
  for (const key of [
    target,
    normalizeSchemaId(target),
    ...aliases,
    ...aliases.map(normalizeSchemaId),
  ]) {
    if (isRecord(output.reports[key])) return output.reports[key];
  }
  return undefined;
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
  if (labels.length === 0) return payload;
  const prediction = payload.prediction;
  const index =
    typeof prediction === "number"
      ? prediction
      : typeof prediction === "string" && /^\d+$/.test(prediction)
        ? Number(prediction)
        : -1;
  return {
    ...payload,
    labels,
    prediction: labels[index] ?? prediction,
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
  if (payload === undefined || isSkippedSchemaReportPayload(payload)) return false;
  const kind = typeof report.kind === "string" ? report.kind : "report";
  return isBuiltinReportKind(kind) || hasMeaningfulValue(payload);
};

export const getSchemaResultReports = (
  version: SchemaVersionDto,
  result: Pick<PredictionResultDto, "modelId" | "output">,
): SchemaDisplayReport[] => {
  const binding = version.bindings.find((item) => item.modelId === result.modelId);
  return reportsOf(version.formSchema).reduce<SchemaDisplayReport[]>((items, report, order) => {
    const id = reportId(report);
    const target = reportTargetForBinding(report, binding);
    if (!id || !target) return items;
    const payload = normalizeReportPayload(report, payloadFor(target, result.output, [id]));
    if (!isRenderablePayload(report, payload)) return items;
    items.push({
      id,
      order,
      label: reportLabel(report),
      kind: typeof report.kind === "string" ? report.kind : "report",
      config: report,
      labels: reportLabels(report),
      payload,
    });
    return items;
  }, []);
};
