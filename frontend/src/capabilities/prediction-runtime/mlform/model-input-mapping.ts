/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { calculateSeriesAggregation, type SeriesAggregation } from "mlform/builtins";
import { resolveDisplayKey } from "@/capabilities/prediction-runtime/mlform/display-key";
import {
  type BindingIdentity,
  mappedTarget,
  mappedTargets,
  targetKey,
} from "@/capabilities/prediction-runtime/mlform/mapped-to";
import type {
  JsonRecord,
  PredictionPayloadField,
} from "@/capabilities/prediction-runtime/mlform/shared";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

/** Reads a literal model key or MLForm's nested form of it; the literal key wins. */
const readModelValue = (modelValues: JsonRecord, target: string): [] | [unknown] => {
  if (Object.hasOwn(modelValues, target)) return [modelValues[target]];
  let value: unknown = modelValues;
  for (const segment of target
    .split(".")
    .map((item) => item.trim())
    .filter(Boolean)) {
    if (!isRecord(value) || !Object.hasOwn(value, segment)) return [];
    value = value[segment];
  }
  return [value];
};

export const applySchemaRunInputMapping = (
  modelValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  binding?: BindingIdentity,
): JsonRecord =>
  fields.reduce<JsonRecord>((payload, field) => {
    if (field.kind === "onehot-category" && Array.isArray(field.options)) {
      field.options.forEach((option) => {
        if (typeof option !== "object" || option === null || Array.isArray(option)) return;
        const optionRecord = option as JsonRecord;
        const target = targetKey(mappedTarget(optionRecord.mappedTo, binding));
        if (!target) return;
        const value = readModelValue(modelValues, target);
        if (value.length > 0) payload[target] = value[0];
      });
      return payload;
    }
    const target = targetKey(mappedTarget(field.mappedTo, binding));
    if (target) {
      const value = readModelValue(modelValues, target);
      if (value.length > 0) payload[target] = value[0];
    }
    if (field.kind === "series" && Array.isArray(field.aggregations)) {
      field.aggregations.forEach((aggregation) => {
        if (!isRecord(aggregation)) return;
        const aggregateTarget = targetKey(mappedTarget(aggregation.mappedTo, binding));
        if (!aggregateTarget) return;
        const value = readModelValue(modelValues, aggregateTarget);
        if (value.length > 0) payload[aggregateTarget] = value[0];
      });
    }
    return payload;
  }, {});

/**
 * A record that keeps each series field's rows under the field's display key, as a run stores
 * them, with the model values the form submits for those rows: the rows under each feature they
 * route to, and each aggregation computed from them as MLForm computes it.
 */
export const withSeriesModelValues = (
  values: JsonRecord,
  fields: readonly PredictionPayloadField[],
): JsonRecord =>
  fields.reduce<JsonRecord>(
    (record, field) => {
      const key = field.kind === "series" ? resolveDisplayKey(field) : undefined;
      const rows = key === undefined ? undefined : values[key];
      if (!Array.isArray(rows)) return record;
      mappedTargets(field.mappedTo).forEach((target) => {
        record[target] = rows;
      });
      if (!Array.isArray(field.aggregations)) return record;
      field.aggregations.filter(isRecord).forEach((aggregation) => {
        const value = calculateSeriesAggregation(rows, aggregation as SeriesAggregation);
        mappedTargets(aggregation.mappedTo).forEach((target) => {
          record[target] = value;
        });
      });
      return record;
    },
    { ...values },
  );
