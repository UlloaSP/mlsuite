/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord } from "../../../algorithms/mlform/shared";
import type { JsonRecord } from "../../../api/schemas/dtos";

type Candidate = {
  base: string;
  category: string;
  field: JsonRecord;
};

/** ONE_HOT_KINDS: internal constant/cache for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const ONE_HOT_KINDS = new Set(["boolean", "number", "integer"]);

/** title: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const title = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

/** splitOneHotKey: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const splitOneHotKey = (key: string): Pick<Candidate, "base" | "category"> | null => {
  const separator = "__";
  const index = key.indexOf(separator);
  if (index <= 0) return null;
  const base = key.slice(0, index);
  const category = key.slice(index + separator.length);
  return base && category ? { base, category } : null;
};

/** isOneHotField: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isOneHotField = (field: JsonRecord): boolean => {
  const kind = getString(field.kind)?.toLowerCase() ?? "";
  return ONE_HOT_KINDS.has(kind);
};

/** firstMappedString: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const firstMappedString = (mappedTo: unknown): string | undefined => {
  if (typeof mappedTo === "string") return mappedTo;
  if (!isRecord(mappedTo)) return undefined;
  return Object.values(mappedTo).find((value): value is string => typeof value === "string");
};

/** candidateFor: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const candidateFor = (field: JsonRecord): Candidate | null => {
  if (!isOneHotField(field)) return null;
  const key = firstMappedString(field.mappedTo);
  if (!key) return null;
  const parts = splitOneHotKey(key);
  return parts ? { ...parts, field } : null;
};

/** acceptedGroups: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const acceptedGroups = (fields: JsonRecord[]): Map<string, Candidate[]> => {
  const fieldKeys = new Set(fields.map((field) => firstMappedString(field.mappedTo)));
  const groups = new Map<string, Candidate[]>();
  fields.forEach((field) => {
    const candidate = candidateFor(field);
    if (!candidate) return;
    groups.set(candidate.base, [...(groups.get(candidate.base) ?? []), candidate]);
  });
  return new Map(
    [...groups.entries()].filter(([base, group]) => group.length >= 2 && !fieldKeys.has(base)),
  );
};

/** createMasterField: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const createMasterField = (base: string, group: Candidate[]): JsonRecord => ({
  kind: "onehot-category",
  label: title(base),
  required: group.some(({ field }) => field.required === true),
  options: group.map(({ category, field }) => ({
    label: title(category),
    value: category,
    mappedTo: field.mappedTo,
  })),
});

/**
 * applyOneHotCategories: applies a deterministic transformation to the supplied data
 *
 * Purpose: collapses compatible one-hot encoded fields into visible category fields.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const applyOneHotCategories = (schema: unknown): JsonRecord => {
  if (!isRecord(schema)) return { fields: [], reports: [] };
  const fields = Array.isArray(schema.fields) ? schema.fields.filter(isRecord) : [];
  const groups = acceptedGroups(fields);
  const emitted = new Set<string>();
  const nextFields = fields.flatMap((field) => {
    const candidate = candidateFor(field);
    if (!candidate) return [field];
    const group = groups.get(candidate.base);
    if (!group) return [field];
    if (emitted.has(candidate.base)) return [];
    emitted.add(candidate.base);
    return [createMasterField(candidate.base, group)];
  });
  return { ...schema, fields: nextFields };
};

/**
 * countVisibleSchemaFields: counts records matching the domain predicate
 *
 * Purpose: collapses compatible one-hot encoded fields into visible category fields.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const countVisibleSchemaFields = (schema: JsonRecord | undefined): number => {
  const fields = Array.isArray(schema?.fields) ? schema.fields.filter(isRecord) : [];
  return fields.filter((field) => field.hidden !== true).length;
};
