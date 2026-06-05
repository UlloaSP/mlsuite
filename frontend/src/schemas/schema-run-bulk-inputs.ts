/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, SchemaVersionDto } from "./types";
import {
  findMappedOptionByValue,
  mappedCategoryOptions,
} from "../app/utils/mlform/mapped-category-options";

type FieldRecord = JsonRecord & {
  id?: string;
  label?: string;
  kind?: string;
  hidden?: boolean;
  includeInSubmission?: boolean;
  options?: Array<JsonRecord & { value?: unknown; mapping?: JsonRecord }>;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getFields = (schema: unknown): FieldRecord[] =>
  isRecord(schema) && Array.isArray(schema.fields)
    ? schema.fields.filter(isRecord).map((field) => field as FieldRecord)
    : [];

const keyFor = (field: FieldRecord): string | null =>
  typeof field.label === "string" && field.label.trim()
    ? field.label
    : typeof field.id === "string" && field.id.trim()
      ? field.id
      : null;

const isUiOnlyMappedCategory = (field: FieldRecord): boolean =>
  field.kind === "mapped-category" && field.includeInSubmission === false;

export const getModelInputBulkSchema = (schema: unknown): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return schema;
  return {
    ...schema,
    fields: schema.fields.flatMap((field) => {
      if (!isRecord(field)) return [field];
      const record = field as FieldRecord;
      return isUiOnlyMappedCategory(record) ? [] : [{ ...record, hidden: false }];
    }),
  };
};

export const toSchemaRunSerializedValues = (
  version: SchemaVersionDto,
  inputs: JsonRecord,
): Record<string, unknown> => {
  const fields = getFields(version.formSchema);
  const values = fields.reduce<Record<string, unknown>>((payload, field) => {
    if (!field.id || isUiOnlyMappedCategory(field)) return payload;
    const key = keyFor(field);
    if (!key || !(key in inputs)) return payload;
    const value = inputs[key];
    payload[field.id] = value;
    return payload;
  }, {});

  fields.forEach((field) => {
    if (!field.id || !isUiOnlyMappedCategory(field)) return;
    const key = keyFor(field);
    if (!key || !(key in inputs)) return;
    const value = inputs[key];
    if (field.kind === "mapped-category" && Array.isArray(field.options)) {
      const option = findMappedOptionByValue(mappedCategoryOptions(field), value);
      if (option?.mapping && isRecord(option.mapping)) {
        Object.entries(option.mapping).forEach(([targetFieldId, mappedValue]) => {
          if (targetFieldId in values) return;
          values[targetFieldId] = mappedValue;
        });
      }
    }
  });

  return values;
};
