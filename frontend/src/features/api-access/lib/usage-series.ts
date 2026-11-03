/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ApiUsagePoint } from "@/shared/api/openapi.gen";

/** Outcomes are states, so they wear the status roles; each is also named in the legend. */
export const USAGE_SERIES = [
  { key: "succeeded", label: "Succeeded", color: "var(--color-success)" },
  { key: "rejected", label: "Refused (4xx)", color: "var(--color-warning)" },
  { key: "failed", label: "Failed (5xx)", color: "var(--color-danger)" },
] as const;

type UsageSeries = (typeof USAGE_SERIES)[number];

/** One outcome's share of a bucket: a stacked bar segment that still knows its whole bucket. */
export type UsageSegment = { bucket: ApiUsagePoint; series: UsageSeries; count: number };

/** Buckets as segments, outcome by outcome in `USAGE_SERIES` order, which is the stack order. */
export const usageSegments = (points: readonly ApiUsagePoint[]): UsageSegment[] =>
  points.flatMap((bucket) =>
    USAGE_SERIES.map((series) => ({ bucket, series, count: bucket[series.key] })),
  );

const HOUR = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** A bucket's start as an axis tick or, with `full`, as a tooltip title. */
export const formatBucket = (start: string, hourly: boolean, full: boolean) => {
  const at = new Date(start);
  if (!hourly) return DAY.format(at);
  return full ? `${DAY.format(at)} ${HOUR.format(at)}` : HOUR.format(at);
};
