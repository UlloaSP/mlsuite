/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { resolveDisplayKey } from "@/capabilities/prediction-runtime/mlform/display-key";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

export const applyPredictionInputsToSchema = (
  schema: unknown,
  inputs: Record<string, unknown>,
): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return schema;

  return {
    ...schema,
    fields: schema.fields.map((field) => {
      if (!isRecord(field)) return field;
      const displayKey = resolveDisplayKey(field);
      return !displayKey || !(displayKey in inputs)
        ? field
        : { ...field, defaultValue: inputs[displayKey] };
    }),
  };
};
