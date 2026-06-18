/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord } from "../../../algorithms/mlform/shared";
import type { JsonRecord } from "../../../schemas/types";

type Candidate = {
  base: string;
  category: string;
  field: JsonRecord;
};

const ONE_HOT_KINDS = new Set(["boolean", "number", "integer"]);

const title = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const splitOneHotKey = (key: string): Pick<Candidate, "base" | "category"> | null => {
  const separator = "__";
  const index = key.indexOf(separator);
  if (index <= 0) return null;
  const base = key.slice(0, index);
  const category = key.slice(index + separator.length);
  return base && category ? { base, category } : null;
};

const isOneHotField = (field: JsonRecord): boolean => {
  const kind = getString(field.kind)?.toLowerCase() ?? "";
  return ONE_HOT_KINDS.has(kind);
};

const firstMappedString = (mappedTo: unknown): string | undefined => {
  if (typeof mappedTo === "string") return mappedTo;
  if (!isRecord(mappedTo)) return undefined;
  return Object.values(mappedTo).find((value): value is string => typeof value === "string");
};

const candidateFor = (field: JsonRecord): Candidate | null => {
  if (!isOneHotField(field)) return null;
  const key = firstMappedString(field.mappedTo);
  if (!key) return null;
  const parts = splitOneHotKey(key);
  return parts ? { ...parts, field } : null;
};

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

export const countVisibleSchemaFields = (schema: JsonRecord | undefined): number => {
  const fields = Array.isArray(schema?.fields) ? schema.fields.filter(isRecord) : [];
  return fields.filter((field) => field.hidden !== true).length;
};
