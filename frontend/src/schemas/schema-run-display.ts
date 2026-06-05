/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { isBuiltinReportKind } from "../app/utils/mlform/builtin-registry";
import { type JsonRecord, getString, isRecord } from "../app/utils/mlform/shared";
import { toLegacyReportPayload } from "../app/utils/mlform/report-normalization";
import { isSkippedSchemaReportPayload } from "../app/utils/mlform/schema-report-plugin-context";
import {
  findMappedOptionByMapping,
  findMappedOptionByValue,
  mappedCategoryOptions,
  mappedOptionDisplayValue,
  mappedOptionSubmitValue,
} from "../app/utils/mlform/mapped-category-options";
import type { PredictionResultDto, SchemaVersionDto } from "./types";

type DisplayInput = { key: string; label: string; value: unknown };
export type SchemaDisplayReport = {
  id: string;
  order: number;
  label: string;
  kind: string;
  payload?: JsonRecord;
  labels?: string[];
};

const fieldsOf = (schema: unknown): JsonRecord[] =>
  isRecord(schema) && Array.isArray(schema.fields) ? schema.fields.filter(isRecord) : [];

const reportsOf = (schema: unknown): ReportConfig[] =>
  isRecord(schema) && Array.isArray(schema.reports)
    ? (schema.reports.filter(isRecord) as ReportConfig[])
    : [];

const fieldKey = (field: JsonRecord): string => getString(field.label) ?? getString(field.id) ?? "";

const hasMappedDirectValue = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");

const mappedCategoryValue = (
  field: JsonRecord,
  inputData: JsonRecord,
  keyById: Map<string, string>,
  mode: "display" | "submit",
): unknown => {
  const direct = inputData[fieldKey(field)];
  const options = mappedCategoryOptions(field);
  if (hasMappedDirectValue(direct)) {
    const directOption = findMappedOptionByValue(options, direct);
    if (directOption) {
      return mode === "display"
        ? mappedOptionDisplayValue(directOption)
        : mappedOptionSubmitValue(directOption);
    }
    return direct;
  }
  const mappedOption = findMappedOptionByMapping(
    options,
    inputData,
    (targetId) => keyById.get(targetId) ?? targetId,
  );
  if (mappedOption) {
    return mode === "display"
      ? mappedOptionDisplayValue(mappedOption)
      : mappedOptionSubmitValue(mappedOption);
  }
  return inputData[fieldKey(field)];
};

const schemaInputs = (
  schema: unknown,
  inputData: JsonRecord,
  mode: "display" | "submit",
): DisplayInput[] => {
  const fields = fieldsOf(schema);
  const keyById = fields.reduce<Map<string, string>>((map, field) => {
    const id = getString(field.id);
    if (id) map.set(id, fieldKey(field));
    return map;
  }, new Map());
  return fields.reduce<DisplayInput[]>((items, field) => {
    if (field.hidden === true) return items;
    const key = fieldKey(field);
    if (!key) return items;
    const value =
      getString(field.kind) === "mapped-category"
        ? mappedCategoryValue(field, inputData, keyById, mode)
        : inputData[key];
    items.push({ key, label: getString(field.label) ?? key, value });
    return items;
  }, []);
};

export const getVisibleSchemaInputs = (schema: unknown, inputData: JsonRecord): DisplayInput[] =>
  schemaInputs(schema, inputData, "display");

export const getSchemaRunPrefillInputs = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  Object.fromEntries(
    schemaInputs(schema, inputData, "submit").map((input) => [input.key, input.value]),
  );

export const getVisibleSchemaInputRecord = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  Object.fromEntries(
    getVisibleSchemaInputs(schema, inputData).map((input) => [input.label, input.value]),
  );

const reportId = (report: ReportConfig): string | undefined =>
  typeof report.id === "string" ? report.id : undefined;

const reportLabel = (report: ReportConfig): string =>
  typeof report.label === "string" ? report.label : (reportId(report) ?? "Report");

const payloadFor = (
  report: ReportConfig,
  source: string,
  output: JsonRecord,
): JsonRecord | undefined => {
  if (isRecord(output.reports) && isRecord(output.reports[source])) return output.reports[source];
  const id = reportId(report);
  if (id && isRecord(output.reports) && isRecord(output.reports[id])) {
    return output.reports[id];
  }
  return toLegacyReportPayload(report, output);
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

const METADATA_KEYS = new Set(["endpoint", "modelId", "signatureId", "backendUrl", "status"]);

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
  result: Pick<PredictionResultDto, "modelId" | "signatureId" | "output">,
): SchemaDisplayReport[] => {
  const binding = version.bindings.find(
    (item) => item.modelId === result.modelId && item.signatureId === result.signatureId,
  );
  const mapping = isRecord(binding?.outputMapping) ? binding.outputMapping : {};
  const reports = reportsOf(version.formSchema);
  return reports.reduce<SchemaDisplayReport[]>((items, report, order) => {
    const id = reportId(report);
    if (!id || typeof mapping[id] !== "string") return items;
    const payload = normalizeReportPayload(report, payloadFor(report, mapping[id], result.output));
    if (!isRenderablePayload(report, payload)) return items;
    items.push({
      id,
      order,
      label: reportLabel(report),
      kind: typeof report.kind === "string" ? report.kind : "report",
      labels: reportLabels(report),
      payload,
    });
    return items;
  }, []);
};

export const mergeSchemaRunInputs = (
  inputData: JsonRecord,
  results: readonly Pick<PredictionResultDto, "modelInput">[],
): JsonRecord =>
  results.reduce<JsonRecord>((payload, result) => ({ ...payload, ...result.modelInput }), {
    ...inputData,
  });

export const formatDisplayValue = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "N/A";
  return String(value);
};
