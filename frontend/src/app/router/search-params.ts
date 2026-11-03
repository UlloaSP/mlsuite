/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * Search params are plain strings, as in `URLSearchParams`, never JSON: shared and bookmarked
 * addresses such as `?q=42&filter=active` keep their exact form, and each page reads and
 * validates the values it owns.
 */
export const parseSearch = (search: string): Record<string, string> =>
  Object.fromEntries(new URLSearchParams(search));

export const stringifySearch = (values: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    // Validated search values are text; numbers and booleans are written as text too.
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : "";
};
