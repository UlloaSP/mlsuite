/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface BulkPredictionRecord {
	name: string;
	inputs: Record<string, unknown>;
}

export interface SkippedRecord {
	line: number;
	name?: string;
	reason: string;
}

export interface ParseCsvPredictionResult {
	records: BulkPredictionRecord[];
	skipped: SkippedRecord[];
}

type CsvRow = {
	line: number;
	values: string[];
};

type SignatureField = {
	name: string;
	kind: string;
	required: boolean;
};

const TEXT_KINDS = new Set(["text", "long-text", "date", "category", "mapped-category", "single-choice"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | null =>
	typeof value === "string" && value.trim() ? value.trim() : null;

const getFieldName = (field: Record<string, unknown>): string | null => {
	if (isRecord(field.ui)) {
		const backendKey = getString(field.ui.backendKey);
		if (backendKey) return backendKey;
	}
	return getString(field.label) ?? getString(field.id);
};

const getSignatureFields = (signatureSchema: unknown): SignatureField[] => {
	if (!isRecord(signatureSchema) || !Array.isArray(signatureSchema.fields)) {
		return [];
	}
	return signatureSchema.fields.flatMap((field) => {
		if (!isRecord(field)) return [];
		const name = getFieldName(field);
		const kind = getString(field.kind);
		return name && kind ? [{ name, kind, required: field.required === true }] : [];
	});
};

const parseCsvRows = (text: string): { rows: CsvRow[]; error?: SkippedRecord } => {
	const rows: CsvRow[] = [];
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
			if (cell.length > 0) {
				return { rows, error: { line, reason: "Malformed CSV quote" } };
			}
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
			if (values.some((value) => value.trim().length > 0)) {
				rows.push({ line: rowLine, values });
			}
			values = [];
			cell = "";
			if (char === "\r" && next === "\n") index++;
			line++;
			rowLine = line;
			continue;
		}

		cell += char;
	}

	if (quoted) {
		return { rows, error: { line: rowLine, reason: "Unclosed quoted CSV field" } };
	}
	values.push(cell);
	if (values.some((value) => value.trim().length > 0)) {
		rows.push({ line: rowLine, values });
	}
	return { rows };
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

const coerceValue = (raw: string, field: SignatureField): { value?: unknown; error?: string } => {
	const value = raw.trim();
	if (!value) {
		return field.required ? { error: `Missing required value for "${field.name}"` } : { value: undefined };
	}
	if (field.kind === "number" || field.kind === "rating") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? { value: parsed } : { error: `"${field.name}" must be a finite number` };
	}
	if (field.kind === "boolean") {
		const parsed = parseBoolean(value);
		return parsed === null ? { error: `"${field.name}" must be a boolean` } : { value: parsed };
	}
	if (field.kind === "multi-choice") {
		return { value: value.split(";").flatMap((item) => {
			const trimmed = item.trim();
			return trimmed ? [trimmed] : [];
		}) };
	}
	if (field.kind === "series") {
		try {
			const parsed: unknown = JSON.parse(value);
			return Array.isArray(parsed) ? { value: parsed } : { error: `"${field.name}" must be a JSON array` };
		} catch {
			return { error: `"${field.name}" must be a JSON array` };
		}
	}
	if (TEXT_KINDS.has(field.kind)) {
		return { value };
	}
	if (value.startsWith("{") || value.startsWith("[")) {
		try {
			return { value: JSON.parse(value) as unknown };
		} catch {
			return { error: `"${field.name}" contains invalid JSON` };
		}
	}
	return { value };
};

export function parseCsvPredictionFile(
	text: string,
	signatureSchema: unknown,
	maxRecords = 10000,
): ParseCsvPredictionResult {
	const { rows, error } = parseCsvRows(text);
	if (error) return { records: [], skipped: [error] };
	if (rows.length === 0) return { records: [], skipped: [{ line: 1, reason: "CSV file is empty" }] };

	const [headerRow, ...dataRows] = rows;
	const headers = headerRow.values.map((value) => value.trim());
	const fields = getSignatureFields(signatureSchema);
	const fieldMap = new Map(fields.map((field) => [field.name, field]));
	const skipped: SkippedRecord[] = [];

	if (headers[0] !== "name") {
		return { records: [], skipped: [{ line: headerRow.line, reason: 'First CSV column must be "name"' }] };
	}
	if (new Set(headers).size !== headers.length) {
		return { records: [], skipped: [{ line: headerRow.line, reason: "CSV headers must be unique" }] };
	}

	const inputHeaders = headers.slice(1);
	const missing = fields.reduce<string[]>((items, field) => {
		if (!inputHeaders.includes(field.name)) {
			items.push(field.name);
		}
		return items;
	}, []);
	const extra = inputHeaders.filter((header) => !fieldMap.has(header));
	if (missing.length > 0 || extra.length > 0) {
		return {
			records: [],
			skipped: [
				...(missing.length > 0 ? [{ line: headerRow.line, reason: `Missing input columns: ${missing.join(", ")}` }] : []),
				...(extra.length > 0 ? [{ line: headerRow.line, reason: `Unknown input columns: ${extra.join(", ")}` }] : []),
			],
		};
	}

	if (dataRows.length > maxRecords) {
		return {
			records: [],
			skipped: [{ line: 0, reason: `File exceeds maximum of ${maxRecords} records (found ${dataRows.length})` }],
		};
	}

	const records: BulkPredictionRecord[] = [];
	for (const row of dataRows) {
		const name = row.values[0]?.trim() ?? "";
		if (!name) {
			skipped.push({ line: row.line, reason: 'Missing or empty "name" field' });
			continue;
		}

		const inputs: Record<string, unknown> = {};
		let rowError: string | null = null;
		for (let index = 0; index < inputHeaders.length; index++) {
			const field = fieldMap.get(inputHeaders[index]);
			if (!field) continue;
			const result = coerceValue(row.values[index + 1] ?? "", field);
			if (result.error) {
				rowError = result.error;
				break;
			}
			inputs[field.name] = result.value;
		}
		if (rowError) {
			skipped.push({ line: row.line, name, reason: rowError });
			continue;
		}
		records.push({ name, inputs });
	}

	return { records, skipped };
}
