/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const BUILTIN_FIELD_KINDS = new Set(["text", "number", "boolean", "category", "date", "time-series"]);
const BUILTIN_REPORT_KINDS = new Set(["classifier", "regressor"]);

export const schemaNeedsActivePluginCatalog = (schema: unknown): boolean => {
	if (!schema || typeof schema !== "object") {
		return false;
	}

	const raw = schema as {
		fields?: unknown;
		reports?: unknown;
		explanations?: unknown;
	};

	if (Array.isArray(raw.explanations) && raw.explanations.length > 0) {
		return true;
	}

	if (
		Array.isArray(raw.fields) &&
		raw.fields.some(
			(field) =>
				typeof field === "object" &&
				field !== null &&
				"kind" in field &&
				typeof (field as { kind?: unknown }).kind === "string" &&
				!BUILTIN_FIELD_KINDS.has((field as { kind: string }).kind),
		)
	) {
		return true;
	}

	return (
		Array.isArray(raw.reports) &&
		raw.reports.some(
			(report) =>
				typeof report === "object" &&
				report !== null &&
				"kind" in report &&
				typeof (report as { kind?: unknown }).kind === "string" &&
				!BUILTIN_REPORT_KINDS.has((report as { kind: string }).kind),
		)
	);
};
