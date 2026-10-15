/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatCount } from "@/features/api-access/lib/api-format";
import { formatBucket, USAGE_SERIES } from "@/features/api-access/lib/usage-series";

/** The counts of one bucket, by outcome, in text ink beside each outcome's swatch. */
export function UsageTooltip({
  active,
  payload,
  label,
  hourly,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number | string }>;
  label?: string | number;
  hourly: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-menu border border-line bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1.5 font-mono text-3xs text-fg-muted">
        {formatBucket(String(label), hourly, true)}
      </p>
      {USAGE_SERIES.map((series) => {
        const entry = payload.find((item) => item.dataKey === series.key);
        return (
          <div key={series.key} className="flex items-center justify-between gap-4 text-fg">
            <span className="flex items-center gap-1.5 text-fg-secondary">
              <span
                className="inline-block size-2 rounded-sm"
                style={{ background: series.color }}
              />
              {series.label}
            </span>
            <span className="font-mono">{formatCount(Number(entry?.value ?? 0))}</span>
          </div>
        );
      })}
    </div>
  );
}
