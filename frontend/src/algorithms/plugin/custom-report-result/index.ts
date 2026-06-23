/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * NormalizedCustomReportResult: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: normalizes custom report presenter output into renderable report result blocks.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type NormalizedCustomReportResult = {
  title: string | null;
  html: string | null;
  blocks: string[];
  emptyText: string | null;
  jsonFallback: string | null;
};

/** isRecord: internal predicate for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** normalizeTextBlocks: internal normalization helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const normalizeTextBlocks = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
};

/**
 * normalizeCustomReportResult: normalizes loose runtime data into the app contract
 *
 * Purpose: normalizes custom report presenter output into renderable report result blocks.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
