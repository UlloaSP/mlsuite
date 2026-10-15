/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** Outcomes are states, so they wear the status roles; each is also named in the legend. */
export const USAGE_SERIES = [
  { key: "succeeded", label: "Succeeded", color: "var(--color-success)" },
  { key: "rejected", label: "Refused (4xx)", color: "var(--color-warning)" },
  { key: "failed", label: "Failed (5xx)", color: "var(--color-danger)" },
] as const;

const HOUR = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** A bucket's start as an axis tick or, with `full`, as a tooltip title. */
export const formatBucket = (start: string, hourly: boolean, full: boolean) => {
  const at = new Date(start);
  if (!hourly) return DAY.format(at);
  return full ? `${DAY.format(at)} ${HOUR.format(at)}` : HOUR.format(at);
};
