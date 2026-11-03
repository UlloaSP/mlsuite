import type { ChartPoint } from "@tanstack/charts";
import type { MetricPointDto } from "@/features/infrastructure/api/infrastructure.types";
import { formatTimestamp } from "@/features/infrastructure/lib/formatters";
import { formatChartValue, LAYER_CONFIG } from "@/features/infrastructure/lib/overview-metrics";

/** The focused sample's value for every drawn layer; each layer's series is its label. */
export function ChartTooltip({ points }: { points: readonly ChartPoint<MetricPointDto>[] }) {
  const sample = points[0]?.datum;
  if (!sample) return null;
  const entries = Object.values(LAYER_CONFIG).filter((config) =>
    points.some((point) => point.group === config.label),
  );
  return (
    <div className="rounded-menu border border-line bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1.5 font-mono text-3xs text-fg-muted">{formatTimestamp(sample.timestamp)}</p>
      {entries.map((entry) => (
        <div
          key={`${entry.label}-${entry.color}`}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-sm" style={{ background: entry.color }} />
            {entry.label}
          </span>
          <span className="font-mono">{formatChartValue(entry.unit, sample[entry.dataKey])}</span>
        </div>
      ))}
    </div>
  );
}
