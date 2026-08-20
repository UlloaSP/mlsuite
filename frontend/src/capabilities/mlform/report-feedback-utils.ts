/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeCustomReportResult } from "@/capabilities/mlform/custom-report-result";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripTreeToken = (value: string): string =>
  value
    .trim()
    .replace(/^[*\d.)\-\s]+/, "")
    .replace(/^[|_\\/\->:\s]+/, "")
    .trim();

const formatReportTree = (value: string): string => {
  const parts = value.split(/(?:\s*\|\s*){2,}/).reduce<string[]>((items, part) => {
    const stripped = stripTreeToken(part);
    if (stripped.length > 0) items.push(stripped);
    return items;
  }, []);

  if (parts.length === 0) return value.trim();
  if (parts.length === 1) return parts[0];

  return parts
    .map((part, index) => (index === 0 ? part : `${"  ".repeat(index - 1)}└─ ${part}`))
    .join("\n");
};

const normalizeDisplayedReportContent = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.includes("|__") || trimmed.includes("||") || trimmed.startsWith("*")
    ? formatReportTree(trimmed)
    : trimmed;
};

const getReportContent = (payload: unknown): string[] => {
  if (typeof payload === "string" && payload.trim()) return [payload];
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  const reportPayload = isRecord(payload) ? payload : null;
  if (typeof reportPayload?.explanation === "string" && reportPayload.explanation.trim()) {
    return [reportPayload.explanation];
  }
  const normalized = reportPayload ? normalizeCustomReportResult(reportPayload) : null;
  return normalized
    ? [
        ...normalized.blocks,
        ...(normalized.html ? [normalized.html] : []),
        ...(normalized.jsonFallback ? [normalized.jsonFallback] : []),
      ].filter((item) => item.trim())
    : [];
};

export const getFormattedReportContent = (payload: unknown): string[] =>
  getReportContent(payload).map(normalizeDisplayedReportContent);
