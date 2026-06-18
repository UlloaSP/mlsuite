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
