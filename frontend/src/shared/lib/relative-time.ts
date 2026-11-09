/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatDate } from "@/shared/lib/date-time";

const UNITS = [
  { suffix: "d", seconds: 86_400 },
  { suffix: "h", seconds: 3_600 },
  { suffix: "m", seconds: 60 },
  { suffix: "s", seconds: 1 },
] as const;

/** Past this, how long ago stops being useful and the date says more. */
const RECENT_SECONDS = 7 * 86_400;

/**
 * When something happened, one way everywhere: "47s ago" or "3d ago" for the last week, then the
 * date in the user's locale ("Nov 2, 2026"). Callers write "Updated {time}", never "ago".
 */
export function formatRelativeTime(value: string | undefined, now = Date.now()): string {
  if (!value) return "No date";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const elapsedSeconds = Math.max(1, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds >= RECENT_SECONDS) return formatDate(value);
  const match = UNITS.find((item) => elapsedSeconds >= item.seconds) ?? UNITS[UNITS.length - 1];
  return `${Math.floor(elapsedSeconds / match.seconds)}${match.suffix} ago`;
}

export function modifierName(name?: string | null, email?: string | null): string {
  return name || email || "Unknown user";
}
