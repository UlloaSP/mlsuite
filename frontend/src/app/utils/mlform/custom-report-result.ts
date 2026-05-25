/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type NormalizedCustomReportResult = {
  title: string | null;
  html: string | null;
  blocks: string[];
  emptyText: string | null;
  jsonFallback: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTextBlocks = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
};

export const normalizeCustomReportResult = (value: unknown): NormalizedCustomReportResult => {
  if (typeof value === "string" || Array.isArray(value)) {
    return {
      title: null,
      html: null,
      blocks: normalizeTextBlocks(value),
      emptyText: null,
      jsonFallback: null,
    };
  }
  if (!isRecord(value)) {
    return {
      title: null,
      html: null,
      blocks: [],
      emptyText: null,
      jsonFallback: value === undefined ? null : JSON.stringify(value, null, 2),
    };
  }
  const hasStructuredResult =
    typeof value.title === "string" ||
    typeof value.html === "string" ||
    Array.isArray(value.blocks) ||
    typeof value.emptyText === "string";
  if (!hasStructuredResult) {
    return {
      title: null,
      html: null,
      blocks: [],
      emptyText: null,
      jsonFallback: JSON.stringify(value, null, 2),
    };
  }
  return {
    title: typeof value.title === "string" && value.title.trim().length > 0 ? value.title : null,
    html: typeof value.html === "string" && value.html.trim().length > 0 ? value.html : null,
    blocks: normalizeTextBlocks(value.blocks),
    emptyText:
      typeof value.emptyText === "string" && value.emptyText.trim().length > 0
        ? value.emptyText
        : null,
    jsonFallback: null,
  };
};
