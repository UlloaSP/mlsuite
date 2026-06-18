/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mappedTarget, targetKey } from "../../mlform/mapped-to";

/**
 * BulkPredictionRecord: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: converts tabular upload rows into accepted and skipped bulk prediction records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export interface BulkPredictionRecord {
  name: string;
  inputs: Record<string, unknown>;
}

/**
 * SkippedRecord: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: converts tabular upload rows into accepted and skipped bulk prediction records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export interface SkippedRecord {
  line: number;
  name?: string;
  reason: string;
}

/**
 * ParseBulkPredictionResult: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: converts tabular upload rows into accepted and skipped bulk prediction records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export interface ParseBulkPredictionResult {
  records: BulkPredictionRecord[];
  skipped: SkippedRecord[];
}

/**
 * TabularPredictionRow: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: converts tabular upload rows into accepted and skipped bulk prediction records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type TabularPredictionRow = {
  line: number;
  values: unknown[];
};

type SchemaField = {
  name: string;
  kind: string;
  required: boolean;
};

/** TEXT_KINDS: internal constant/cache for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const TEXT_KINDS = new Set(["text", "long-text", "date", "category", "single-choice"]);

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** getString: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** getCellText: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getCellText = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null || value === undefined ? "" : String(value);
};

/** getFieldName: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getFieldName = (field: Record<string, unknown>): string | null => {
  return targetKey(mappedTarget(field.mappedTo)) ?? null;
};

/** getSchemaFields: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getSchemaFields = (schemaDefinition: unknown): SchemaField[] => {
  if (!isRecord(schemaDefinition) || !Array.isArray(schemaDefinition.fields)) return [];
  return schemaDefinition.fields.flatMap((field) => {
    if (!isRecord(field)) return [];
    const name = getFieldName(field);
    const kind = getString(field.kind);
    return name && kind ? [{ name, kind, required: field.required === true }] : [];
  });
};

/** parseBoolean: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const parseBoolean = (value: string): boolean | null => {
  switch (value.trim().toLowerCase()) {
    case "true":
    case "1":
    case "yes":
    case "si":
      return true;
    case "false":
    case "0":
    case "no":
      return false;
    default:
      return null;
  }
};

/** coerceValue: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const coerceValue = (raw: unknown, field: SchemaField): { value?: unknown; error?: string } => {
  const text = getCellText(raw).trim();
  if (!text) {
    return field.required
      ? { error: `Missing required value for "${field.name}"` }
      : { value: undefined };
  }
  if (field.kind === "number" || field.kind === "rating") {
    const parsed = typeof raw === "number" ? raw : Number(text);
    return Number.isFinite(parsed)
      ? { value: parsed }
      : { error: `"${field.name}" must be a finite number` };
  }
  if (field.kind === "boolean") {
    if (typeof raw === "boolean") return { value: raw };
    const parsed = parseBoolean(text);
    return parsed === null ? { error: `"${field.name}" must be a boolean` } : { value: parsed };
  }
  if (field.kind === "multi-choice") {
    return {
      value: text.split(";").flatMap((item) => {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }),
    };
  }
  if (field.kind === "series") {
    try {
      const parsed: unknown = typeof raw === "string" ? JSON.parse(text) : raw;
      return Array.isArray(parsed)
        ? { value: parsed }
        : { error: `"${field.name}" must be a JSON array` };
    } catch {
      return { error: `"${field.name}" must be a JSON array` };
    }
  }
  if (TEXT_KINDS.has(field.kind)) return { value: text };
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return { value: JSON.parse(text) as unknown };
    } catch {
      return { error: `"${field.name}" contains invalid JSON` };
    }
  }
  return { value: text };
};

/** autogeneratedName: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const autogeneratedName = (base: number, index: number): string =>
  `bulk-upload-${base + index + 1}`;

/**
 * parseTabularPredictionRecords: parses external input and separates accepted data from errors
 *
 * Purpose: converts tabular upload rows into accepted and skipped bulk prediction records.
 * @param rows - Input consumed by parseTabularPredictionRecords; uses the converts tabular upload rows into accepted and skipped bulk prediction records contract.
 * @param schemaDefinition - Input consumed by parseTabularPredictionRecords; uses the converts tabular upload rows into accepted and skipped bulk prediction records contract.
 * @param maxRecords - Input consumed by parseTabularPredictionRecords; uses the converts tabular upload rows into accepted and skipped bulk prediction records contract.
 * @param autoNameBase - Input consumed by parseTabularPredictionRecords; uses the converts tabular upload rows into accepted and skipped bulk prediction records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function parseTabularPredictionRecords(
  rows: TabularPredictionRow[],
  schemaDefinition: unknown,
  maxRecords = 10000,
  autoNameBase?: number,
): ParseBulkPredictionResult {
  if (rows.length === 0) return { records: [], skipped: [{ line: 1, reason: "File is empty" }] };

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.values.map((value) => getCellText(value).trim());
  const fields = getSchemaFields(schemaDefinition);
  const fieldMap = new Map(fields.map((field) => [field.name, field]));
  const skipped: SkippedRecord[] = [];
  const hasNameHeader = headers[0] === "name";

  if (new Set(headers).size !== headers.length) {
    return { records: [], skipped: [{ line: headerRow.line, reason: "Headers must be unique" }] };
  }

  const inputHeaders = hasNameHeader ? headers.slice(1) : headers;
  if (!hasNameHeader && autoNameBase === undefined) {
    return {
      records: [],
      skipped: [
        { line: headerRow.line, reason: 'Missing "name" column requires prediction id base' },
      ],
    };
  }
  const missing = fields.reduce<string[]>((items, field) => {
    if (!inputHeaders.includes(field.name)) items.push(field.name);
    return items;
  }, []);
  const extra = inputHeaders.filter((header) => !fieldMap.has(header));
  if (missing.length > 0 || extra.length > 0) {
    return {
      records: [],
      skipped: [
        ...(missing.length > 0
          ? [{ line: headerRow.line, reason: `Missing input columns: ${missing.join(", ")}` }]
          : []),
        ...(extra.length > 0
          ? [{ line: headerRow.line, reason: `Unknown input columns: ${extra.join(", ")}` }]
          : []),
      ],
    };
  }
  if (dataRows.length > maxRecords) {
    return {
      records: [],
      skipped: [
        {
          line: 0,
          reason: `File exceeds maximum of ${maxRecords} records (found ${dataRows.length})`,
        },
      ],
    };
  }

  const records: BulkPredictionRecord[] = [];
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const name = hasNameHeader
      ? getCellText(row.values[0]).trim()
      : autogeneratedName(autoNameBase ?? 0, rowIndex);
    if (!name) {
      skipped.push({ line: row.line, reason: 'Missing or empty "name" field' });
      continue;
    }

    const inputs: Record<string, unknown> = {};
    let rowError: string | null = null;
    for (let index = 0; index < inputHeaders.length; index++) {
      const field = fieldMap.get(inputHeaders[index]);
      if (!field) continue;
      const result = coerceValue(row.values[index + (hasNameHeader ? 1 : 0)], field);
      if (result.error) {
        rowError = result.error;
        break;
      }
      inputs[field.name] = result.value;
    }
    if (rowError) skipped.push({ line: row.line, name, reason: rowError });
    else records.push({ name, inputs });
  }
  return { records, skipped };
}
