/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mappedTarget, setMappedValue, targetKey } from "../../../algorithms/mlform/mapped-to";
import {
  type JsonRecord,
  type PredictionPayloadField,
  getString,
  isRecord,
} from "../../../algorithms/mlform/shared";

/** shouldInclude: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const shouldInclude = (field: PredictionPayloadField): boolean =>
  field.includeInSubmission !== false;

/** mappedTargets: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const mappedTargets = (mappedTo: unknown): string[] => {
  const direct = targetKey(mappedTarget(mappedTo));
  if (direct) return [direct];
  if (!isRecord(mappedTo)) return [];
  return Object.values(mappedTo).flatMap((value) =>
    typeof value === "string" || typeof value === "number" ? [String(value)] : [],
  );
};

/** oneHotFieldValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const oneHotFieldValue = (
  serializedValues: Record<string, unknown>,
  field: PredictionPayloadField,
): unknown => {
  if (field.id in serializedValues) return serializedValues[field.id];
  if (!Array.isArray(field.options)) return undefined;
  const selected = field.options.find((option) => {
    if (!isRecord(option)) return false;
    const targets = [
      targetKey(mappedTarget(option.mappedTo)),
      ...(isRecord(option.mappedTo)
        ? Object.values(option.mappedTo).map((value) =>
            typeof value === "string" || typeof value === "number" ? String(value) : undefined,
          )
        : []),
    ].filter((target): target is string => !!target);
    return targets.some((target) => serializedValues[target] === 1);
  });
  return isRecord(selected) ? (selected.value ?? selected.label) : undefined;
};

/**
 * toCanonicalPayload: converts data into another contract shape
 *
 * Purpose: converts serialized MLForm values into canonical, field-id, and visible payloads.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const toCanonicalPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord => {
  return fields.reduce<JsonRecord>((payload, field) => {
    if (!shouldInclude(field)) return payload;
    if (field.kind === "onehot-category" && Array.isArray(field.options)) {
      field.options.forEach((option) => {
        if (!isRecord(option)) return;
        mappedTargets(option.mappedTo).forEach((target) => {
          payload[target] =
            target in serializedValues
              ? serializedValues[target]
              : serializedValues[field.id] === option.value
                ? 1
                : 0;
        });
      });
      return payload;
    }
    const target = mappedTargets(field.mappedTo).find((key) => key in serializedValues);
    if (target) {
      payload[target] = serializedValues[target];
      return payload;
    }
    if (!(field.id in serializedValues)) return payload;
    setMappedValue(payload, field.mappedTo, undefined, serializedValues[field.id]);
    return payload;
  }, {});
};

/**
 * toFieldIdPayload: converts data into another contract shape
 *
 * Purpose: converts serialized MLForm values into canonical, field-id, and visible payloads.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const toFieldIdPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord => {
  return fields.reduce<JsonRecord>((payload, field) => {
    if (!shouldInclude(field) || !(field.id in serializedValues)) return payload;
    payload[field.id] = serializedValues[field.id];
    return payload;
  }, {});
};

/**
 * toVisiblePayload: converts data into another contract shape
 *
 * Purpose: converts serialized MLForm values into canonical, field-id, and visible payloads.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const toVisiblePayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord =>
  fields.reduce<JsonRecord>((payload, field) => {
    const value =
      field.kind === "onehot-category"
        ? oneHotFieldValue(serializedValues, field)
        : field.id in serializedValues
          ? serializedValues[field.id]
          : (field as Record<string, unknown>).defaultValue;
    if ((field as Record<string, unknown>).hidden !== true && value !== undefined) {
      payload[getString(field.label) ?? field.id] = value;
    }
    return payload;
  }, {});
