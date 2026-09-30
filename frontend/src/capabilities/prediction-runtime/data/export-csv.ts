/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const isPlainObject = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

export const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (Array.isArray(obj)) {
    obj.forEach((value, index) =>
      Object.assign(out, flatten(value, prefix ? `${prefix}.${index}` : String(index))),
    );
  } else if (isPlainObject(obj)) {
    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) =>
      Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key)),
    );
  } else {
    out[prefix || "value"] = obj;
  }
  return out;
};

export const toCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

export const csvEscape = (value: string, separator: string) => {
  let next = value;
  if (next.includes('"')) next = next.replace(/"/g, '""');
  if (next.includes(separator) || next.includes("\n") || next.includes("\r")) next = `"${next}"`;
  return next;
};
