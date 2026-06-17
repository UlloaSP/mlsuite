/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import type { ReportConfig } from "mlform/runtime";
import { isBuiltinReportKind } from "../app/utils/mlform/builtin-registry";
import { type JsonRecord, getString, isRecord } from "../app/utils/mlform/shared";
import { isSkippedSchemaReportPayload } from "../app/utils/mlform/schema-report-plugin-context";
import { mappedTarget, targetKey } from "../app/utils/mlform/mapped-to";
import { reportTargetForBinding } from "../app/utils/mlform/schema-run-report-mapping";
import type { PredictionResultDto, SchemaVersionDto } from "./types";

type DisplayInput = { key: string; label: string; value: unknown };
export type SchemaDisplayReport = {
  id: string;
  order: number;
  label: string;
  kind: string;
  config: ReportConfig;
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

const mappedTargetKeys = (mappedTo: unknown): string[] =>
  Array.from(
    new Set(
      [
        targetKey(mappedTarget(mappedTo)),
        ...(isRecord(mappedTo)
          ? Object.values(mappedTo).map((value) =>
              typeof value === "string" || typeof value === "number" ? String(value) : undefined,
            )
          : []),
      ]
        .filter((key): key is string => !!key)
        .filter((key) => key.trim().length > 0),
    ),
  );

const fieldInputKeys = (field: JsonRecord): string[] =>
  Array.from(
    new Set(
      [getString(field.id), getString(field.label), ...mappedTargetKeys(field.mappedTo)].filter(
        (key): key is string => !!key,
      ),
    ),
  );

const fieldInputValue = (field: JsonRecord, inputData: JsonRecord): unknown => {
  const key = fieldInputKeys(field).find(
    (item) => item in inputData && hasMappedDirectValue(inputData[item]),
  );
  return key ? inputData[key] : undefined;
};

const hasMappedDirectValue = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");

const optionDisplayValue = (option: JsonRecord): unknown => option.label ?? option.value;
const optionSubmitValue = (option: JsonRecord): unknown => option.value ?? option.label;

const oneHotValue = (
  field: JsonRecord,
  inputData: JsonRecord,
  mode: "display" | "submit",
): unknown => {
  const direct = fieldInputValue(field, inputData);
  const options = Array.isArray(field.options) ? field.options.filter(isRecord) : [];
  if (hasMappedDirectValue(direct)) return direct;
  const option = options.find((item) => {
    const targets = mappedTargetKeys(item.mappedTo);
    return targets.some((target) => {
      if (!(target in inputData)) return false;
      const value = inputData[target];
      return value === true || value === 1 || String(value).trim().toLowerCase() === "true";
    });
  });
  if (!option) return undefined;
  return mode === "display" ? optionDisplayValue(option) : optionSubmitValue(option);
};

const schemaInputs = (
  schema: unknown,
  inputData: JsonRecord,
  mode: "display" | "submit",
): DisplayInput[] => {
  const fields = fieldsOf(schema);
  return fields.reduce<DisplayInput[]>((items, field) => {
    if (field.hidden === true) return items;
    const key = fieldKey(field);
    if (!key) return items;
    const value =
      getString(field.kind) === "onehot-category"
        ? oneHotValue(field, inputData, mode)
        : fieldInputValue(field, inputData);
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
    getVisibleSchemaInputs(schema, inputData)
      .filter((input) => input.value !== undefined)
      .map((input) => [input.label, input.value]),
  );

export const getMappedSchemaInputRecord = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  fieldsOf(schema).reduce<JsonRecord>((payload, field) => {
    if (field.hidden === true) return payload;
    if (getString(field.kind) === "onehot-category") {
      const selected = oneHotValue(field, inputData, "submit");
      const options = Array.isArray(field.options) ? field.options.filter(isRecord) : [];
      options.forEach((option) => {
        const value = optionSubmitValue(option);
        mappedTargetKeys(option.mappedTo).forEach((target) => {
          payload[target] = selected === value ? 1 : 0;
        });
      });
      return payload;
    }
    const value = fieldInputValue(field, inputData);
    if (value === undefined) return payload;
    mappedTargetKeys(field.mappedTo).forEach((target) => {
      payload[target] = value;
    });
    return payload;
  }, {});

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
  const reports = reportsOf(version.formSchema);
  return reports.reduce<SchemaDisplayReport[]>((items, report, order) => {
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

export const mergeSchemaRunInputs = (
  inputData: JsonRecord,
  results: readonly Pick<PredictionResultDto, "modelInput">[],
): JsonRecord => ({
  ...results.reduce<JsonRecord>((payload, result) => ({ ...payload, ...result.modelInput }), {}),
  ...inputData,
});

export const formatDisplayValue = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "N/A";
  return String(value);
};
