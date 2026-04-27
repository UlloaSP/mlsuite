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

export interface ParseJsonlResult {
  records: BulkPredictionRecord[];
  skipped: SkippedRecord[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseJsonlFile(text: string, maxRecords = 10000): ParseJsonlResult {
  const lines = text.split("\n").map((line) => line.trim());
  const nonEmpty = lines
    .map((content, index) => ({ content, line: index + 1 }))
    .filter((entry) => entry.content.length > 0);

  const records: BulkPredictionRecord[] = [];
  const skipped: SkippedRecord[] = [];

  if (nonEmpty.length > maxRecords) {
    skipped.push({
      line: 0,
      reason: `File exceeds maximum of ${maxRecords} records (found ${nonEmpty.length})`,
    });
    return { records, skipped };
  }

  for (const { content, line } of nonEmpty) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      skipped.push({ line, reason: "Invalid JSON" });
      continue;
    }

    if (!isRecord(parsed)) {
      skipped.push({ line, reason: "Expected JSON object" });
      continue;
    }

    if (typeof parsed.name !== "string" || !parsed.name.trim()) {
      skipped.push({ line, reason: 'Missing or empty "name" field' });
      continue;
    }

    if (!isRecord(parsed.inputs)) {
      skipped.push({ line, name: parsed.name, reason: 'Missing or invalid "inputs" field' });
      continue;
    }

    records.push({ name: parsed.name.trim(), inputs: parsed.inputs as Record<string, unknown> });
  }

  return { records, skipped };
}
