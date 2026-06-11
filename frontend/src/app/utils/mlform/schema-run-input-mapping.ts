/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, PredictionPayloadField } from "./shared";

const fieldKeyMap = (fields: readonly PredictionPayloadField[]): Map<string, string> => {
  const map = new Map<string, string>();
  fields.forEach((field) => {
    map.set(field.id, field.id);
    if (field.label) map.set(field.label, field.id);
  });
  return map;
};

export const applySchemaRunInputMapping = (
  fieldValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  mapping?: JsonRecord,
): JsonRecord => {
  if (!mapping || Object.keys(mapping).length === 0) {
    return { ...fieldValues };
  }
  const keys = fieldKeyMap(fields);
  return Object.entries(mapping).reduce<JsonRecord>((payload, [canonicalKey, modelKey]) => {
    if (typeof modelKey !== "string") return payload;
    const fieldId = keys.get(canonicalKey) ?? keys.get(modelKey);
    if (fieldId && fieldId in fieldValues) {
      payload[modelKey] = fieldValues[fieldId];
      return payload;
    }
    if (canonicalKey in fieldValues) {
      payload[modelKey] = fieldValues[canonicalKey];
      return payload;
    }
    if (modelKey in fieldValues) {
      payload[modelKey] = fieldValues[modelKey];
    }
    return payload;
  }, {});
};
