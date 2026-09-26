import { formatTimestamp } from "@/features/infrastructure/lib/formatters";
import { formatChartValue, LAYER_CONFIG } from "@/features/infrastructure/lib/overview-metrics";

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; color?: string; value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1.5 font-mono text-3xs text-fg-muted">
        {formatTimestamp(String(label ?? ""))}
      </p>
      {payload.map((entry) => (
        <div
          key={`${entry.name ?? "metric"}-${entry.color ?? "color"}`}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-sm" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono">
            {formatChartValue(
              unitForPayload(entry.name),
              typeof entry.value === "number" ? entry.value : null,
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function unitForPayload(name?: string) {
  return Object.values(LAYER_CONFIG).find((config) => config.label === name)?.unit ?? "percent";
}
