/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";
import type { JsonRecord, SchemaVersionDto } from "../../../api/schemas/dtos";

type FieldRecord = JsonRecord & {
  id?: string;
  label?: string;
  kind?: string;
  hidden?: boolean;
  includeInSubmission?: boolean;
  mappedTo?: unknown;
  options?: Array<JsonRecord & { value?: unknown; mappedTo?: unknown }>;
};

/** isRecord: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** getFields: internal lookup helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getFields = (schema: unknown): FieldRecord[] => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return [];
  const fields: FieldRecord[] = [];
  schema.fields.forEach((field) => {
    if (isRecord(field)) fields.push(field as FieldRecord);
  });
  return fields;
};

/** inputKeysFor: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const inputKeysFor = (field: FieldRecord): string[] =>
  Array.from(
    new Set(
      [field.id].filter((key): key is string => typeof key === "string" && key.trim().length > 0),
    ),
  );

/** displayKeysFor: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const displayKeysFor = (field: FieldRecord): string[] =>
  typeof field.label === "string" && field.label.trim().length > 0 ? [field.label] : [];

/** mappedTargets: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const mappedTargets = (mappedTo: unknown): string[] => {
  const direct = targetKey(mappedTarget(mappedTo));
  if (direct) return [direct];
  if (!isRecord(mappedTo)) return [];
  return Object.values(mappedTo).flatMap((value) =>
    typeof value === "string" || typeof value === "number" ? [String(value)] : [],
  );
};

/** modelInputFields: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const modelInputFields = (version: SchemaVersionDto): FieldRecord[] => {
  const byKey = new Map<string, FieldRecord>();
  getFields(version.formSchema).forEach((field) => {
    if (field.kind === "onehot-category" && Array.isArray(field.options)) {
      field.options.forEach((option) => {
        mappedTargets(option.mappedTo).forEach((key) => {
          byKey.set(key, { kind: "number", id: key, label: key });
        });
      });
      return;
    }
    mappedTargets(field.mappedTo).forEach((key) => {
      byKey.set(key, { ...field, id: key, label: key, hidden: false });
    });
  });
  return [...byKey.values()];
};

/**
 * getModelInputBulkSchema: extracts a derived value without mutating input
 *
 * Purpose: builds schema-run bulk upload schema and serialized values from model-facing rows.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
      return [{ ...record, hidden: false }];
    }),
  };
};

/**
 * toSchemaRunSerializedValues: converts data into another contract shape
 *
 * Purpose: builds schema-run bulk upload schema and serialized values from model-facing rows.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toSchemaRunSerializedValues = (
  version: SchemaVersionDto,
  inputs: JsonRecord,
): Record<string, unknown> => {
  const fields = getFields(version.formSchema);
  const schemaKeys = new Set(
    fields.flatMap((field) => [...inputKeysFor(field), ...displayKeysFor(field)]),
  );
  const consumedKeys = new Set<string>();
  const values = fields.reduce<Record<string, unknown>>((payload, field) => {
    if (!field.id) return payload;
    if (field.kind === "onehot-category" && Array.isArray(field.options)) {
      const selected = field.options.find((option) =>
        mappedTargets(option.mappedTo).some((target) => {
          if (inputs[target] !== 1) return false;
          consumedKeys.add(target);
          return true;
        }),
      );
      field.options
        .flatMap((option) => mappedTargets(option.mappedTo))
        .forEach((target) => {
          if (target in inputs) consumedKeys.add(target);
        });
      if (selected) payload[field.id] = selected.value ?? selected.label;
      return payload;
    }
    const modelKey = mappedTargets(field.mappedTo).find((target) => target in inputs);
    if (modelKey) {
      consumedKeys.add(modelKey);
      payload[field.id] = inputs[modelKey];
      return payload;
    }
    const key = inputKeysFor(field).find((candidate) => candidate in inputs);
    if (key) payload[field.id] = inputs[key];
    return payload;
  }, {});

  Object.entries(inputs).forEach(([key, value]) => {
    if (!schemaKeys.has(key) && !consumedKeys.has(key) && !(key in values)) values[key] = value;
  });

  return values;
};
