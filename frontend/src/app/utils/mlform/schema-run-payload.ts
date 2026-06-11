/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { findMappedOptionByValue, mappedCategoryOptions } from "./mapped-category-options";
import { type JsonRecord, type PredictionPayloadField, getString, isRecord } from "./shared";

const hasMappedOptions = (field: PredictionPayloadField): boolean =>
  Array.isArray((field as Record<string, unknown>).options) &&
  ((field as Record<string, unknown>).options as unknown[]).some(
    (option) => isRecord(option) && isRecord(option.mapping),
  );

const shouldInclude = (field: PredictionPayloadField): boolean =>
  field.includeInSubmission !== false &&
  !(field.kind === "mapped-category" && hasMappedOptions(field));

const expandMappedCategoryValues = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): Record<string, unknown> => {
  const values = { ...serializedValues };
  fields.forEach((field) => {
    const selectedValue =
      field.id in serializedValues
        ? serializedValues[field.id]
        : (field as Record<string, unknown>).defaultValue;
    if (field.kind !== "mapped-category" || selectedValue === undefined) return;
    values[field.id] = selectedValue;
    const selected = findMappedOptionByValue(
      mappedCategoryOptions(field as Record<string, unknown>),
      selectedValue,
    );
    if (!isRecord(selected?.mapping)) return;
    Object.entries(selected.mapping).forEach(([targetFieldId, mappedValue]) => {
      values[targetFieldId] = mappedValue;
    });
  });
  return values;
};

export const toCanonicalPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord => {
  const expandedValues = expandMappedCategoryValues(serializedValues, fields);
  return fields.reduce<JsonRecord>((payload, field) => {
    if (shouldInclude(field) && field.id in expandedValues) {
      payload[getString(field.label) ?? field.id] = expandedValues[field.id];
    }
    return payload;
  }, {});
};

export const toFieldIdPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord => {
  const expandedValues = expandMappedCategoryValues(serializedValues, fields);
  return fields.reduce<JsonRecord>((payload, field) => {
    if (!shouldInclude(field) || !(field.id in expandedValues)) return payload;
    payload[field.id] = expandedValues[field.id];
    return payload;
  }, {});
};

export const toVisiblePayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): JsonRecord =>
  fields.reduce<JsonRecord>((payload, field) => {
    const value =
      field.id in serializedValues
        ? serializedValues[field.id]
        : (field as Record<string, unknown>).defaultValue;
    if ((field as Record<string, unknown>).hidden !== true && value !== undefined) {
      payload[getString(field.label) ?? field.id] = value;
    }
    return payload;
  }, {});
