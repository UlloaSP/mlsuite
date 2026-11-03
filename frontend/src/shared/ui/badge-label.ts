/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

// Enum values from the API ("PARTIAL_SUCCESS", "OWNER") read as sentence case.
// Short all-caps words (CPU, API) are left alone as likely acronyms.
const ENUM_VALUE = /^[A-Z][A-Z0-9]*(?:[_ ][A-Z0-9]+)*$/;

/** "PARTIAL_SUCCESS" → "Partial success"; other text is returned unchanged. */
export const enumLabel = (value: string): string => {
  if (!ENUM_VALUE.test(value) || value.length < 4) return value;
  const words = value.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const badgeLabel = (value: ReactNode): ReactNode =>
  typeof value === "string" ? enumLabel(value) : value;
