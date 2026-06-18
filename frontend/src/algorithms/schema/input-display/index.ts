/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";
import type { PredictionResultDto } from "../../../schemas/types";

type DisplayInput = { key: string; label: string; value: unknown };

const fieldsOf = (schema: unknown): JsonRecord[] =>
  isRecord(schema) && Array.isArray(schema.fields) ? schema.fields.filter(isRecord) : [];

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

const hasMappedDirectValue = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");

const fieldInputValue = (field: JsonRecord, inputData: JsonRecord): unknown => {
  const key = fieldInputKeys(field).find(
    (item) => item in inputData && hasMappedDirectValue(inputData[item]),
  );
  return key ? inputData[key] : undefined;
};

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
  const option = options.find((item) =>
    mappedTargetKeys(item.mappedTo).some((target) => {
      if (!(target in inputData)) return false;
      const value = inputData[target];
      return value === true || value === 1 || String(value).trim().toLowerCase() === "true";
    }),
  );
  if (!option) return undefined;
  return mode === "display" ? optionDisplayValue(option) : optionSubmitValue(option);
};

const schemaInputs = (
  schema: unknown,
  inputData: JsonRecord,
  mode: "display" | "submit",
): DisplayInput[] =>
  fieldsOf(schema).reduce<DisplayInput[]>((items, field) => {
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
