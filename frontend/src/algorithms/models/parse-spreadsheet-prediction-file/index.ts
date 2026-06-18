/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { readSheet } from "read-excel-file/browser";
import { parseCsvPredictionFile } from "../parse-csv-prediction-file";
import {
  parseTabularPredictionRecords,
  type BulkPredictionRecord,
  type ParseBulkPredictionResult,
  type SkippedRecord,
  type TabularPredictionRow,
} from "../parse-tabular-prediction-records";

export type { BulkPredictionRecord, SkippedRecord };
/**
 * ParseSpreadsheetPredictionResult: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: routes spreadsheet uploads to CSV/XLSX parsing.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type ParseSpreadsheetPredictionResult = ParseBulkPredictionResult;

/** CSV_TYPES: internal constant/cache for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const CSV_TYPES = new Set(["text/csv", "application/csv"]);
/** XLSX_TYPES: internal constant/cache for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

/** getExtension: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getExtension = (fileName: string): string => fileName.split(".").pop()?.toLowerCase() ?? "";

/** isCsvFile: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isCsvFile = (file: File): boolean =>
  CSV_TYPES.has(file.type) || getExtension(file.name) === "csv";

/** isXlsxFile: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isXlsxFile = (file: File): boolean =>
  XLSX_TYPES.has(file.type) || getExtension(file.name) === "xlsx";

/** toRows: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const toRows = (rows: unknown[][]): TabularPredictionRow[] =>
  rows.flatMap((values, index) =>
    values.some((value) => value !== null && value !== undefined && String(value).trim().length > 0)
      ? [{ line: index + 1, values }]
      : [],
  );

/**
 * parseSpreadsheetPredictionFile: parses external input and separates accepted data from errors
 *
 * Purpose: routes spreadsheet uploads to CSV/XLSX parsing.
 * @param file - Input consumed by parseSpreadsheetPredictionFile; uses the routes spreadsheet uploads to CSV/XLSX parsing contract.
 * @param schemaDefinition - Input consumed by parseSpreadsheetPredictionFile; uses the routes spreadsheet uploads to CSV/XLSX parsing contract.
 * @param maxRecords - Input consumed by parseSpreadsheetPredictionFile; uses the routes spreadsheet uploads to CSV/XLSX parsing contract.
 * @param autoNameBase - Input consumed by parseSpreadsheetPredictionFile; uses the routes spreadsheet uploads to CSV/XLSX parsing contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export async function parseSpreadsheetPredictionFile(
  file: File,
  schemaDefinition: unknown,
  maxRecords = 10000,
  autoNameBase?: number,
): Promise<ParseSpreadsheetPredictionResult> {
  if (isCsvFile(file)) {
    return parseCsvPredictionFile(await file.text(), schemaDefinition, maxRecords, autoNameBase);
  }

  if (!isXlsxFile(file)) {
    return {
      records: [],
      skipped: [{ line: 0, reason: "Unsupported file type. Upload a CSV or XLSX file." }],
    };
  }

  try {
    const rows = await readSheet(file);
    return parseTabularPredictionRecords(toRows(rows), schemaDefinition, maxRecords, autoNameBase);
  } catch (error: unknown) {
    return {
      records: [],
      skipped: [
        {
          line: 0,
          reason: error instanceof Error ? error.message : "XLSX file could not be read",
        },
      ],
    };
  }
}
