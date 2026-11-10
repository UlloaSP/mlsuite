/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * Shortens text to `max` characters by cutting its middle, so the start and the end (where names
 * that share a prefix differ, as in "production · 9 Nov, 01:01:22") both stay readable.
 */
export const middleEllipsis = (text: string, max: number) => {
  if (text.length <= max) return text;
  const kept = max - 1;
  const head = Math.ceil(kept / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - (kept - head))}`;
};
