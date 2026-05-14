/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { readSheet } from "read-excel-file/browser";
import { parseCsvPredictionFile } from "./parseCsvPredictionFile";
import {
	parseTabularPredictionRecords,
	type BulkPredictionRecord,
	type ParseBulkPredictionResult,
	type SkippedRecord,
	type TabularPredictionRow,
} from "./parseTabularPredictionRecords";

export type { BulkPredictionRecord, SkippedRecord };
export type ParseSpreadsheetPredictionResult = ParseBulkPredictionResult;

const CSV_TYPES = new Set(["text/csv", "application/csv"]);
const XLSX_TYPES = new Set([
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/octet-stream",
]);

const getExtension = (fileName: string): string =>
	fileName.split(".").pop()?.toLowerCase() ?? "";

const isCsvFile = (file: File): boolean =>
	CSV_TYPES.has(file.type) || getExtension(file.name) === "csv";

const isXlsxFile = (file: File): boolean =>
	XLSX_TYPES.has(file.type) || getExtension(file.name) === "xlsx";

const toRows = (rows: unknown[][]): TabularPredictionRow[] =>
	rows.flatMap((values, index) =>
		values.some((value) => value !== null && value !== undefined && String(value).trim().length > 0)
			? [{ line: index + 1, values }]
			: [],
	);

export async function parseSpreadsheetPredictionFile(
	file: File,
	signatureSchema: unknown,
	maxRecords = 10000,
): Promise<ParseSpreadsheetPredictionResult> {
	if (isCsvFile(file)) {
		return parseCsvPredictionFile(await file.text(), signatureSchema, maxRecords);
	}

	if (!isXlsxFile(file)) {
		return {
			records: [],
			skipped: [{ line: 0, reason: "Unsupported file type. Upload a CSV or XLSX file." }],
		};
	}

	try {
		const rows = await readSheet(file);
		return parseTabularPredictionRecords(toRows(rows), signatureSchema, maxRecords);
	} catch (error: unknown) {
		return {
			records: [],
			skipped: [{
				line: 0,
				reason: error instanceof Error ? error.message : "XLSX file could not be read",
			}],
		};
	}
}
