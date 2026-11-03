/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { barY, defineChart } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { Chart } from "@tanstack/charts/react/tooltip";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { UsageTooltip } from "@/features/api-access/components/UsageTooltip";
import { formatCount } from "@/features/api-access/lib/api-format";
import { formatBucket, USAGE_SERIES, usageSegments } from "@/features/api-access/lib/usage-series";
import type { ApiUsagePoint } from "@/shared/api/openapi.gen";

type Props = { points: ApiUsagePoint[]; hourly: boolean };

const TICK_LABELS = { fontSize: 11, opacity: 1 };

/** Calls per hour or day, stacked by outcome, on one axis of counts. */
export function UsageChart({ points, hourly }: Props) {
  const totals = points.map((point) => point.succeeded + point.rejected + point.failed);
  const total = totals.reduce((sum, calls) => sum + calls, 0);
  const tallest = Math.max(0, ...totals);
  const label = `${formatCount(total)} calls, by ${hourly ? "hour" : "day"} and outcome`;
  const definition = defineChart({
    marks: [
      crosshair({ x: { band: { fill: "var(--color-surface-hover)" } }, y: false }),
      barY(usageSegments(points), {
        x: (segment) => segment.bucket.start,
        y: "count",
        z: (segment) => segment.series.label,
        key: (segment) => `${segment.bucket.start}:${segment.series.key}`,
        fill: (segment) => segment.series.color,
        stroke: "var(--color-surface)",
        strokeWidth: 1,
        radius: { end: 4 },
      }),
    ],
    scales: {
      x: {
        scale: () => scaleBand<string>().padding(0.1),
        axis: {
          line: { stroke: "var(--color-line)", strokeOpacity: 1 },
          ticks: { size: 0, format: (start: string) => formatBucket(start, hourly, false) },
          tickLabels: { ...TICK_LABELS, thin: { minGap: 24 } },
        },
      },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: { stroke: "var(--color-line)", strokeOpacity: 1, strokeDasharray: "2 4" },
        axis: {
          line: false,
          // A tick count no larger than the tallest bar keeps every step a whole number of calls.
          ticks: { size: 0, count: Math.max(1, Math.min(5, tallest)) },
          tickLabels: TICK_LABELS,
        },
      },
    },
    theme: { muted: "var(--color-fg-muted)" },
    focus: "group-x",
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      sort: "color-domain",
      items: [
        { channel: "x", text: (point) => formatBucket(point.datum.bucket.start, hourly, true) },
      ],
    },
  });
  return (
    <div className="grid gap-3">
      <ul aria-label="Legend" className="flex flex-wrap gap-4 text-xs text-fg-secondary">
        {USAGE_SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: series.color }}
            />
            {series.label}
          </li>
        ))}
      </ul>
      <div className="h-60">
        <Chart
          definition={definition}
          ariaLabel={label}
          style={{ height: "100%" }}
          renderTooltipBody={({ points: focused }) => (
            <UsageTooltip points={focused} hourly={hourly} />
          )}
        />
      </div>
    </div>
  );
}
