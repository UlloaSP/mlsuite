/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldValidationContext } from "mlform/runtime";
import { getBuiltinRegistry } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { mappedTarget, targetKey } from "@/capabilities/prediction-runtime/mlform/mapped-to";
import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";

export interface BulkPredictionRecord {
  name: string;
  inputs: Record<string, unknown>;
}

export interface SkippedRecord {
  line: number;
  name?: string;
  reason: string;
}

export interface ParseBulkPredictionResult {
  records: BulkPredictionRecord[];
  skipped: SkippedRecord[];
  /** The whole file was refused (its header, size or format), not some of its data rows. */
  fileRejected: boolean;
}

/** A file none of whose rows can be read, for the problems given. */
export const rejectFile = (...problems: SkippedRecord[]): ParseBulkPredictionResult => ({
  records: [],
  skipped: problems,
  fileRejected: true,
});

export type TabularPredictionRow = {
  line: number;
  values: unknown[];
};

type SchemaField = {
  name: string;
  columns: string[];
  kind: string;
  required: boolean;
  config: JsonRecord;
};

const TEXT_KINDS = new Set(["text", "long-text", "date", "category", "single-choice"]);

const getString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const getCellText = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

const getSchemaFields = (schemaDefinition: unknown): SchemaField[] => {
  if (!isRecord(schemaDefinition) || !Array.isArray(schemaDefinition.fields)) return [];
  return schemaDefinition.fields.flatMap((field) => {
    if (!isRecord(field)) return [];
    const target = mappedTarget(field.mappedTo);
    const name = targetKey(target);
    const kind = getString(field.kind);
    if (!name || !kind) return [];
    // Positional models retain dataframe labels while their runtime keys remain numeric.
    const aliases =
      typeof target === "number"
        ? [getString(field.displayKey), getString(field.label)].filter(
            (key): key is string => !!key,
          )
        : [];
    return [
      {
        name,
        columns: [...new Set([name, ...aliases])],
        kind,
        required: field.required === true,
        config: field,
      },
    ];
  });
};

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

/**
 * A series cell: its rows as a JSON array, normalized, checked and serialized as the form does
 * with the rows a member enters, so a run's aggregations come from the same rows.
 */
const coerceSeries = (
  raw: unknown,
  text: string,
  field: SchemaField,
): { value?: unknown; error?: string } => {
  let parsed: unknown;
  try {
    parsed = typeof raw === "string" ? JSON.parse(text) : raw;
  } catch {
    parsed = undefined;
  }
  if (!Array.isArray(parsed)) return { error: `"${field.name}" must be a JSON array` };
  const series = getBuiltinRegistry().getField("series")!;
  const config = field.config as never;
  const rows = series.normalizeValue?.(parsed, config) ?? parsed;
  const context = { field: config, values: {}, submitCount: 0, validationVersion: 0 };
  const [problem] = series.validateSync?.(rows, config, context as FieldValidationContext) ?? [];
  return problem
    ? { error: `"${field.name}": ${problem}` }
    : { value: series.serializeValue?.(rows, config) ?? rows };
};

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
  if (field.kind === "series") return coerceSeries(raw, text, field);
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

const autogeneratedName = (base: number | string, index: number): string =>
  typeof base === "number" ? `bulk-upload-${base + index + 1}` : `${base}-${index + 1}`;

export function parseTabularPredictionRecords(
  rows: TabularPredictionRow[],
  schemaDefinition: unknown,
  maxRecords = 10000,
  autoNameBase?: number | string,
): ParseBulkPredictionResult {
  if (rows.length === 0) return rejectFile({ line: 0, reason: "File is empty" });

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.values.map((value) => getCellText(value).trim());
  const fields = getSchemaFields(schemaDefinition);
  const skipped: SkippedRecord[] = [];
  const hasNameHeader = headers[0] === "name";

  if (new Set(headers).size !== headers.length) {
    return rejectFile({ line: headerRow.line, reason: "Headers must be unique" });
  }

  const inputHeaders = hasNameHeader ? headers.slice(1) : headers;
  const fieldMap = new Map<string, SchemaField>();
  const mappedNames = new Set<string>();
  const byName = new Map(fields.map((field) => [field.name, field]));
  for (const header of inputHeaders) {
    const canonical = byName.get(header);
    const matches = canonical
      ? [canonical]
      : fields.filter((field) => field.columns.includes(header));
    if (matches.length > 1) {
      return rejectFile({ line: headerRow.line, reason: `Ambiguous input column: ${header}` });
    }
    const field = matches[0];
    if (!field) continue;
    if (mappedNames.has(field.name)) {
      return rejectFile({
        line: headerRow.line,
        reason: `Multiple columns map to input: ${field.name}`,
      });
    }
    mappedNames.add(field.name);
    fieldMap.set(header, field);
  }
  if (!hasNameHeader && autoNameBase === undefined) {
    return rejectFile({
      line: headerRow.line,
      reason: 'Missing "name" column requires prediction id base',
    });
  }
  const missing = fields.reduce<string[]>((items, field) => {
    if (!mappedNames.has(field.name)) items.push(field.name);
    return items;
  }, []);
  const extra = inputHeaders.filter((header) => !fieldMap.has(header));
  if (missing.length > 0 || extra.length > 0) {
    return rejectFile(
      ...(missing.length > 0
        ? [{ line: headerRow.line, reason: `Missing input columns: ${missing.join(", ")}` }]
        : []),
      ...(extra.length > 0
        ? [{ line: headerRow.line, reason: `Unknown input columns: ${extra.join(", ")}` }]
        : []),
    );
  }
  if (dataRows.length > maxRecords) {
    return rejectFile({
      line: 0,
      reason: `File exceeds maximum of ${maxRecords} records (found ${dataRows.length})`,
    });
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
  return { records, skipped, fileRejected: false };
}
