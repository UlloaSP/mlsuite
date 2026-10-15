/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { UsageTooltip } from "@/features/api-access/components/UsageTooltip";
import { formatCount } from "@/features/api-access/lib/api-format";
import { formatBucket, USAGE_SERIES } from "@/features/api-access/lib/usage-series";
import type { ApiUsagePoint } from "@/shared/api/openapi.gen";

type Props = { points: ApiUsagePoint[]; hourly: boolean };

/** Calls per hour or day, stacked by outcome, on one axis of counts. */
export function UsageChart({ points, hourly }: Props) {
  const total = points.reduce(
    (sum, point) => sum + point.succeeded + point.rejected + point.failed,
    0,
  );
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
      <div
        role="img"
        aria-label={`${formatCount(total)} calls, by ${hourly ? "hour" : "day"} and outcome`}
        className="h-60"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="start"
              tickFormatter={(value: string) => formatBucket(value, hourly, false)}
              minTickGap={24}
              tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--color-line)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={40}
              tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-hover)" }}
              content={<UsageTooltip hourly={hourly} />}
            />
            {USAGE_SERIES.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="calls"
                fill={series.color}
                stroke="var(--color-surface)"
                strokeWidth={1}
                radius={index === USAGE_SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
