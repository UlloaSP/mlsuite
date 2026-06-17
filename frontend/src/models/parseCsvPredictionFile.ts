/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  parseTabularPredictionRecords,
  type ParseBulkPredictionResult,
  type SkippedRecord,
  type TabularPredictionRow,
} from "./parseTabularPredictionRecords";

export type ParseCsvPredictionResult = ParseBulkPredictionResult;

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
