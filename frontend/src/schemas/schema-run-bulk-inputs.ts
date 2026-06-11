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

const getFields = (schema: unknown): FieldRecord[] => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return [];
  const fields: FieldRecord[] = [];
  schema.fields.forEach((field) => {
    if (isRecord(field)) fields.push(field as FieldRecord);
  });
  return fields;
};

const keyFor = (field: FieldRecord): string | null =>
  typeof field.label === "string" && field.label.trim()
    ? field.label
    : typeof field.id === "string" && field.id.trim()
      ? field.id
      : null;

const inputKeysFor = (field: FieldRecord): string[] =>
  Array.from(
    new Set(
      [field.id, field.label].filter(
        (key): key is string => typeof key === "string" && key.trim().length > 0,
      ),
    ),
  );

const isUiOnlyMappedCategory = (field: FieldRecord): boolean =>
  field.kind === "mapped-category" && field.includeInSubmission === false;

const matchesFieldKey = (field: FieldRecord, key: string): boolean =>
  field.id === key || field.label === key;

const fieldBySchemaKey = (fields: FieldRecord[], key: string): FieldRecord | undefined =>
  fields.find((field) => matchesFieldKey(field, key));

const fieldForMapping = (
  fields: FieldRecord[],
  schemaKey: string,
  modelKey: string,
): FieldRecord | undefined =>
  fieldBySchemaKey(fields, schemaKey) ?? fieldBySchemaKey(fields, modelKey);

const modelInputFields = (version: SchemaVersionDto): FieldRecord[] => {
  const fields = getFields(version.formSchema);
  const byModelKey = new Map<string, FieldRecord>();
  version.bindings.forEach((binding) => {
    Object.entries(binding.inputMapping ?? {}).forEach(([schemaKey, modelKey]) => {
      if (typeof modelKey !== "string" || byModelKey.has(modelKey)) return;
      const field = fieldForMapping(fields, schemaKey, modelKey);
      byModelKey.set(modelKey, {
        ...(field ?? { kind: "text" }),
        id: modelKey,
        label: modelKey,
      });
    });
  });
  return [...byModelKey.values()];
};

const modelKeyByFieldId = (
  version: SchemaVersionDto,
  fields: FieldRecord[],
): Map<string, string> => {
  const mapping = new Map<string, string>();
  version.bindings.forEach((binding) => {
    Object.entries(binding.inputMapping ?? {}).forEach(([schemaKey, modelKey]) => {
      if (typeof modelKey !== "string") return;
      const field = fieldForMapping(fields, schemaKey, modelKey);
      if (field?.id && !mapping.has(field.id)) mapping.set(field.id, modelKey);
    });
  });
  return mapping;
};

export const getModelInputBulkSchema = (version: SchemaVersionDto): unknown => {
  const schema = version.formSchema;
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return schema;
  const fields = modelInputFields(version);
  if (fields.length > 0) return { ...schema, fields };
  return {
    ...schema,
    fields: schema.fields.flatMap((field) => {
      if (!isRecord(field)) return [field];
      const record = field as FieldRecord;
      if (isUiOnlyMappedCategory(record)) return [];
      const key = inputKeysFor(record)[0] ?? keyFor(record);
      return key
        ? [{ ...record, id: key, label: key, hidden: false }]
        : [{ ...record, hidden: false }];
    }),
  };
};

export const toSchemaRunSerializedValues = (
  version: SchemaVersionDto,
  inputs: JsonRecord,
): Record<string, unknown> => {
  const fields = getFields(version.formSchema);
  const modelKeys = modelKeyByFieldId(version, fields);
  const values = fields.reduce<Record<string, unknown>>((payload, field) => {
    if (!field.id || isUiOnlyMappedCategory(field)) return payload;
    const modelKey = modelKeys.get(field.id);
    if (typeof modelKey === "string" && modelKey in inputs) {
      payload[field.id] = inputs[modelKey];
      return payload;
    }
    const key = inputKeysFor(field).find((candidate) => candidate in inputs);
    if (key) payload[field.id] = inputs[key];
    return payload;
  }, {});

  fields.forEach((field) => {
    if (!field.id || !isUiOnlyMappedCategory(field)) return;
    const key = inputKeysFor(field).find((candidate) => candidate in inputs);
    if (!key) return;
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
