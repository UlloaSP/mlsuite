/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  type BindingIdentity,
  mappedTarget,
  setMappedValue,
  targetKey,
} from "../../../algorithms/mlform/mapped-to";
import type { JsonRecord, PredictionPayloadField } from "../../../algorithms/mlform/shared";

/**
 * applySchemaRunInputMapping: applies a deterministic transformation to the supplied data
 *
 * Purpose: maps schema form values into model-specific analyzer input records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const applySchemaRunInputMapping = (
  fieldValues: JsonRecord,
  fields: readonly PredictionPayloadField[],
  binding?: BindingIdentity,
): JsonRecord =>
  fields.reduce<JsonRecord>((payload, field) => {
    if (field.kind === "onehot-category" && Array.isArray(field.options)) {
      const selected = fieldValues[field.id];
      field.options.forEach((option) => {
        if (typeof option !== "object" || option === null || Array.isArray(option)) return;
        const optionRecord = option as JsonRecord;
        const target = targetKey(mappedTarget(optionRecord.mappedTo, binding));
        if (!target) return;
        payload[target] =
          target in fieldValues
            ? fieldValues[target]
            : String(optionRecord.value ?? optionRecord.label) === String(selected)
              ? 1
              : 0;
      });
      return payload;
    }
    const target = targetKey(mappedTarget(field.mappedTo, binding));
    if (target && target in fieldValues) {
      payload[target] = fieldValues[target];
      return payload;
    }
    if (field.id in fieldValues) {
      setMappedValue(payload, field.mappedTo, binding, fieldValues[field.id]);
    }
    return payload;
  }, {});
