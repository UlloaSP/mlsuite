/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import type { PredictionResultDto } from "../../../api/schemas/dtos";

type DisplayInput = { key: string; label: string; value: unknown };

const fieldsOf = (schema: unknown): JsonRecord[] =>
  isRecord(schema) && Array.isArray(schema.fields) ? schema.fields.filter(isRecord) : [];

const displayKeyOf = (field: JsonRecord): string | undefined => getString(field.displayKey);

const hasDisplayValue = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");

const mappedTargets = (mappedTo: unknown): string[] => {
  if (typeof mappedTo === "string" || typeof mappedTo === "number") return [String(mappedTo)];
  if (!isRecord(mappedTo)) return [];
  return Object.values(mappedTo).flatMap((value) =>
    typeof value === "string" || typeof value === "number" ? [String(value)] : [],
  );
};

const displayCandidates = (field: JsonRecord): string[] =>
  [
    displayKeyOf(field),
    getString(field.id),
    getString(field.label),
    ...mappedTargets(field.mappedTo),
  ].filter((value, index, values): value is string => !!value && values.indexOf(value) === index);

const activeOneHot = (value: unknown): boolean => value === true || value === 1 || value === "1";

const fieldValue = (field: JsonRecord, inputData: JsonRecord): unknown => {
  for (const key of displayCandidates(field)) {
    if (key in inputData && hasDisplayValue(inputData[key])) return inputData[key];
  }
  if (field.kind !== "onehot-category" || !Array.isArray(field.options)) return undefined;
  for (const option of field.options) {
    if (!isRecord(option)) continue;
    if (mappedTargets(option.mappedTo).some((target) => activeOneHot(inputData[target]))) {
      return option.value ?? option.label;
    }
  }
  return undefined;
};

export const getVisibleSchemaInputs = (schema: unknown, inputData: JsonRecord): DisplayInput[] =>
  fieldsOf(schema).reduce<DisplayInput[]>((items, field) => {
    if (field.hidden === true) return items;
    const key = displayCandidates(field)[0];
    const value = fieldValue(field, inputData);
    if (!key || !hasDisplayValue(value)) return items;
    items.push({ key, label: getString(field.label) ?? key, value });
    return items;
  }, []);

export const getSchemaRunPrefillInputs = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  Object.fromEntries(
    fieldsOf(schema)
      .map((field) => {
        const key = displayCandidates(field)[0];
        const value = fieldValue(field, inputData);
        return key && hasDisplayValue(value) ? [key, value] : undefined;
      })
      .filter((entry): entry is [string, unknown] => entry !== undefined),
  );

export const getVisibleSchemaInputRecord = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  Object.fromEntries(
    getVisibleSchemaInputs(schema, inputData).map((input) => [input.label, input.value]),
  );

export const mergeSchemaRunInputs = (
  inputData: JsonRecord,
  results: readonly Pick<PredictionResultDto, "modelInput">[],
): JsonRecord =>
  results.reduce<JsonRecord>(
    (payload, result) => ({
      ...payload,
      ...(isRecord(result.modelInput) ? result.modelInput : {}),
    }),
    { ...inputData },
  );

export const formatDisplayValue = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return "";
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "object") return JSON.stringify(value);
  return "";
};
