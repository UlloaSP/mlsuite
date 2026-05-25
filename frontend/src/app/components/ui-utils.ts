/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const cx = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

export const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none";
