/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import {
  isRecord,
  storedReportPayload,
  type JsonRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import {
  classLabel,
  mappingLabels,
} from "@/capabilities/prediction-runtime/data/report-normalization";
import {
  findStoredReport,
  storedReportId,
} from "@/capabilities/prediction-runtime/data/stored-report";
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
  /** The classes the run stored, which `labels` name in order. */
  classes?: string[];
};

const reportsOf = (schema: unknown): ReportConfig[] =>
  isRecord(schema) && Array.isArray(schema.reports)
    ? (schema.reports.filter(isRecord) as ReportConfig[])
    : [];

const reportLabel = (report: ReportConfig): string =>
  typeof report.label === "string"
    ? report.label
    : typeof report.id === "string"
      ? report.id
      : "Report";

const reportLabels = (report: ReportConfig): string[] =>
  Array.isArray((report as JsonRecord).labels)
    ? ((report as JsonRecord).labels as unknown[]).filter(
        (item): item is string => typeof item === "string",
      )
    : [];

/**
 * A stored report as it is shown: a schema's class labels name the stored classes in order, so
 * the predicted class reads as the label in its place.
 */
export const normalizeReportPayload = (
  report: ReportConfig,
  payload?: JsonRecord,
): JsonRecord | undefined => {
  if (!payload) return undefined;
  const labels = reportLabels(report);
  if (labels.length === 0) return payload;
  const classes = mappingLabels(payload.labels) ?? [];
  return { ...payload, labels, prediction: classLabel(labels, classes, payload.prediction) };
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
    const kind = typeof report.kind === "string" ? report.kind : "report";
    const target = reportTargetForBinding(report, binding);
    const named = typeof report.id === "string" || typeof report.label === "string";
    if (!named || !target) return items;
    const id = storedReportId(report, order);
    const copy = findStoredReport(result.output ?? {}, { storedId: id, target });
    const stored = copy && storedReportPayload(copy);
    const payload = normalizeReportPayload(report, stored);
    if (!isRenderablePayload(report, payload)) return items;
    items.push({
      id,
      order,
      label: reportLabel(report),
      kind,
      config: report,
      labels: reportLabels(report),
      classes: mappingLabels(stored?.labels) ?? [],
      payload,
    });
    return items;
  }, []);
};
