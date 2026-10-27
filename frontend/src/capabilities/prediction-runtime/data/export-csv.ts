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

// What a spreadsheet would start a formula with, also from a visitor's public input.
const FORMULA_START = /^[=+\-@\t\r]/;
// A plain number, "-5" or "+1.5e3", is data a spreadsheet reads as a number, never a formula.
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * One field as RFC 4180 writes it: quoted, with its quotes doubled, when it holds a quote, the
 * separator or a line break. A field a spreadsheet would run as a formula is kept as text by a
 * leading apostrophe, so an export never executes what someone typed into a form.
 */
export const csvEscape = (value: string, separator: string) => {
  const text = FORMULA_START.test(value) && !NUMBER.test(value) ? `'${value}` : value;
  return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
};
