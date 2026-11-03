/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ChartPoint } from "@tanstack/charts";
import { formatCount } from "@/features/api-access/lib/api-format";
import {
  formatBucket,
  USAGE_SERIES,
  type UsageSegment,
} from "@/features/api-access/lib/usage-series";

/** The counts of one bucket, by outcome, in text ink beside each outcome's swatch. */
export function UsageTooltip({
  points,
  hourly,
}: {
  points: readonly ChartPoint<UsageSegment>[];
  hourly: boolean;
}) {
  const bucket = points[0]?.datum.bucket;
  if (!bucket) return null;
  return (
    <div className="rounded-menu border border-line bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1.5 font-mono text-3xs text-fg-muted">
        {formatBucket(bucket.start, hourly, true)}
      </p>
      {USAGE_SERIES.map((series) => (
        <div key={series.key} className="flex items-center justify-between gap-4 text-fg">
          <span className="flex items-center gap-1.5 text-fg-secondary">
            <span className="inline-block size-2 rounded-sm" style={{ background: series.color }} />
            {series.label}
          </span>
          <span className="font-mono">{formatCount(bucket[series.key])}</span>
        </div>
      ))}
    </div>
  );
}
