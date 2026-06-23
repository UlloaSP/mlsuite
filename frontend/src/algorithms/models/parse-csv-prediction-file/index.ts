/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  parseTabularPredictionRecords,
  type ParseBulkPredictionResult,
  type SkippedRecord,
  type TabularPredictionRow,
} from "../parse-tabular-prediction-records";

/**
 * ParseCsvPredictionResult: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: parses CSV bulk prediction files into typed prediction records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type ParseCsvPredictionResult = ParseBulkPredictionResult;

/** parseCsvRows: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const parseCsvRows = (text: string): { rows: TabularPredictionRow[]; error?: SkippedRecord } => {
  const rows: TabularPredictionRow[] = [];
  let values: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === "\n") line++;
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      if (cell.length > 0) return { rows, error: { line, reason: "Malformed CSV quote" } };
      quoted = true;
      continue;
    }
    if (char === ",") {
      values.push(cell);
      cell = "";
      continue;
    }
    if (char === "\r" || char === "\n") {
      values.push(cell);
      if (values.some((value) => value.trim().length > 0)) rows.push({ line: rowLine, values });
      values = [];
      cell = "";
      if (char === "\r" && next === "\n") index++;
      line++;
      rowLine = line;
      continue;
    }
    cell += char;
  }

  if (quoted) return { rows, error: { line: rowLine, reason: "Unclosed quoted CSV field" } };
  values.push(cell);
  if (values.some((value) => value.trim().length > 0)) rows.push({ line: rowLine, values });
  return { rows };
};

/**
 * parseCsvPredictionFile: parses external input and separates accepted data from errors
 *
 * Purpose: parses CSV bulk prediction files into typed prediction records.
 * @param text - Input consumed by parseCsvPredictionFile; uses the parses CSV bulk prediction files into typed prediction records contract.
 * @param schemaDefinition - Input consumed by parseCsvPredictionFile; uses the parses CSV bulk prediction files into typed prediction records contract.
 * @param maxRecords - Input consumed by parseCsvPredictionFile; uses the parses CSV bulk prediction files into typed prediction records contract.
 * @param autoNameBase - Input consumed by parseCsvPredictionFile; uses the parses CSV bulk prediction files into typed prediction records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function parseCsvPredictionFile(
  text: string,
  schemaDefinition: unknown,
  maxRecords = 10000,
  autoNameBase?: number,
): ParseCsvPredictionResult {
  const { rows, error } = parseCsvRows(text);
  if (error) return { records: [], skipped: [error] };
  return parseTabularPredictionRecords(rows, schemaDefinition, maxRecords, autoNameBase);
}
