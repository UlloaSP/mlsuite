/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const UNITS = [
  { suffix: "y", seconds: 31_536_000 },
  { suffix: "mo", seconds: 2_592_000 },
  { suffix: "d", seconds: 86_400 },
  { suffix: "h", seconds: 3_600 },
  { suffix: "m", seconds: 60 },
  { suffix: "s", seconds: 1 },
] as const;

export function formatCompactRelativeTime(value: string | undefined, now = Date.now()): string {
  if (!value) return "No date";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const elapsedSeconds = Math.max(1, Math.floor((now - timestamp) / 1000));
  const match = UNITS.find((item) => elapsedSeconds >= item.seconds) ?? UNITS[UNITS.length - 1];
  return `${Math.floor(elapsedSeconds / match.seconds)}${match.suffix}`;
}

export function modifierName(name?: string | null, email?: string | null): string {
  return name || email || "Unknown user";
}
