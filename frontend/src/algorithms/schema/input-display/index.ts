/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";
import type { PredictionResultDto } from "../../../schemas/types";

type DisplayInput = { key: string; label: string; value: unknown };

/** fieldsOf: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldsOf = (schema: unknown): JsonRecord[] =>
  isRecord(schema) && Array.isArray(schema.fields) ? schema.fields.filter(isRecord) : [];

/** fieldKey: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldKey = (field: JsonRecord): string => getString(field.label) ?? getString(field.id) ?? "";

/** mappedTargetKeys: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** fieldInputKeys: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldInputKeys = (field: JsonRecord): string[] =>
  Array.from(
    new Set(
      [getString(field.id), getString(field.label), ...mappedTargetKeys(field.mappedTo)].filter(
        (key): key is string => !!key,
      ),
    ),
  );

/** hasMappedDirectValue: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const hasMappedDirectValue = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");

/** fieldInputValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldInputValue = (field: JsonRecord, inputData: JsonRecord): unknown => {
  const key = fieldInputKeys(field).find(
    (item) => item in inputData && hasMappedDirectValue(inputData[item]),
  );
  return key ? inputData[key] : undefined;
};

/** optionDisplayValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const optionDisplayValue = (option: JsonRecord): unknown => option.label ?? option.value;
/** optionSubmitValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const optionSubmitValue = (option: JsonRecord): unknown => option.value ?? option.label;

/** oneHotValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** schemaInputs: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/**
 * getVisibleSchemaInputs: extracts a derived value without mutating input
 *
 * Purpose: reconstructs visible schema inputs from raw, field-id, and model-input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getVisibleSchemaInputs = (schema: unknown, inputData: JsonRecord): DisplayInput[] =>
  schemaInputs(schema, inputData, "display");

/**
 * getSchemaRunPrefillInputs: extracts a derived value without mutating input
 *
 * Purpose: reconstructs visible schema inputs from raw, field-id, and model-input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getSchemaRunPrefillInputs = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  Object.fromEntries(
    schemaInputs(schema, inputData, "submit").map((input) => [input.key, input.value]),
  );

/**
 * getVisibleSchemaInputRecord: extracts a derived value without mutating input
 *
 * Purpose: reconstructs visible schema inputs from raw, field-id, and model-input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getVisibleSchemaInputRecord = (schema: unknown, inputData: JsonRecord): JsonRecord =>
  Object.fromEntries(
    getVisibleSchemaInputs(schema, inputData)
      .filter((input) => input.value !== undefined)
      .map((input) => [input.label, input.value]),
  );

/**
 * getMappedSchemaInputRecord: extracts a derived value without mutating input
 *
 * Purpose: reconstructs visible schema inputs from raw, field-id, and model-input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * mergeSchemaRunInputs: performs the exported transformation for this algorithm.
 *
 * Purpose: reconstructs visible schema inputs from raw, field-id, and model-input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const mergeSchemaRunInputs = (
  inputData: JsonRecord,
  results: readonly Pick<PredictionResultDto, "modelInput">[],
): JsonRecord => ({
  ...results.reduce<JsonRecord>((payload, result) => ({ ...payload, ...result.modelInput }), {}),
  ...inputData,
});

/**
 * formatDisplayValue: converts raw data into a stable human-readable string
 *
 * Purpose: reconstructs visible schema inputs from raw, field-id, and model-input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const formatDisplayValue = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "N/A";
  return String(value);
};
