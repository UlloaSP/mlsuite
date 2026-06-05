/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, toUniqueId } from "../app/utils/mlform/shared";
import type { JsonRecord } from "./types";

type Candidate = {
  base: string;
  category: string;
  field: JsonRecord;
  targetId: string;
};

const ONE_HOT_KINDS = new Set(["boolean", "number", "integer"]);

const title = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const encodeIdSource = (key: string): string =>
  Array.from(key)
    .map((char) => (/^[a-zA-Z0-9_]$/.test(char) ? char : `_${char.codePointAt(0)?.toString(16) ?? "0"}_`))
    .join("");

const targetIdFor = (key: string): string => toUniqueId(encodeIdSource(key), key, new Set<string>());

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

const featureKey = (field: JsonRecord): string => getString(field.label) ?? getString(field.id) ?? "field";

const candidateFor = (field: JsonRecord): Candidate | null => {
  if (!isOneHotField(field)) return null;
  const key = featureKey(field);
  const parts = splitOneHotKey(key);
  return parts ? { ...parts, field, targetId: targetIdFor(key) } : null;
};

const acceptedGroups = (fields: JsonRecord[]): Map<string, Candidate[]> => {
  const fieldKeys = new Set(fields.map(featureKey));
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
  kind: "mapped-category",
  id: targetIdFor(base),
  label: title(base),
  required: group.some(({ field }) => field.required === true),
  includeInSubmission: false,
  options: group.map(({ category, targetId }) => ({
    label: title(category),
    value: category,
    mapping: Object.fromEntries(group.map((item) => [item.targetId, item.targetId === targetId ? 1 : 0])),
  })),
});

const createSubordinateField = ({ field, targetId }: Candidate): JsonRecord => ({
  ...field,
  id: targetId,
  label: featureKey(field),
  hidden: true,
  inactiveFieldPolicy: "include",
});

export const applyOneHotMappedCategories = (schema: unknown): JsonRecord => {
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
    return [createMasterField(candidate.base, group), ...group.map(createSubordinateField)];
  });
  return { ...schema, fields: nextFields };
};

export const countVisibleSchemaFields = (schema: JsonRecord | undefined): number => {
  const fields = Array.isArray(schema?.fields) ? schema.fields.filter(isRecord) : [];
  return fields.filter((field) => field.hidden !== true).length;
};
