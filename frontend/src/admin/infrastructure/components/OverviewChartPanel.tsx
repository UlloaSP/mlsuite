/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Overview chart is first-viewport dashboard content.
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { AppBadge, AppSelect } from "../../../app/components";
import { formatTimestamp } from "../../../algorithms/admin/infrastructure/formatters";
import type { InfrastructureOverviewDto } from "../../../api/infrastructure/dtos";
import type {
  ChartLayer,
  ChartValueKey,
} from "../../../algorithms/admin/infrastructure/overview-metrics";
import {
  LAYER_CONFIG,
  chartPointForService,
  formatChartValue,
  yAxisMode,
} from "../../../algorithms/admin/infrastructure/overview-metrics";

export function OverviewChartPanel({
  overview,
  streamConnected,
  chartRange,
}: {
  overview: InfrastructureOverviewDto;
  streamConnected: boolean;
  chartRange: string;
}) {
  const [chartService, setChartService] = useState("all");
  const [layers, setLayers] = useState<Record<ChartLayer, boolean>>({
    cpu: true,
    ram: true,
    diskRead: false,
    diskWrite: false,
    networkRx: false,
    networkTx: false,
  });
  const chartPoints = overview.history.points.map((point) =>
    chartService === "all" ? point : chartPointForService(point, chartService),
  );
  const axisMode = yAxisMode(layers);
  const curValue = (key: ChartValueKey) =>
    chartPoints.length > 0 ? chartPoints[chartPoints.length - 1][key] : null;
  const toggleLayer = (key: ChartLayer) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Service aggregate load &middot; last {chartRange}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Toggle layers to compare Docker CPU, memory, disk, and network metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppSelect
            aria-label="Select chart service"
            className="h-8 min-w-36 px-3 text-xs"
            value={chartService}
            onValueChange={setChartService}
            options={[
              { value: "all", label: "All services" },
              ...overview.services.map((service) => ({
                value: service.name,
                label: service.name,
              })),
            ]}
          />
          <AppBadge
            tone={streamConnected ? "success" : "warning"}
            className="px-2 py-0.5 text-[0.6rem]"
          >
            {streamConnected ? "live" : "snapshot"}
          </AppBadge>
          <AppBadge className="px-2 py-0.5 text-[0.6rem]">
            {overview.history.sampleIntervalSeconds}s sample
          </AppBadge>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 border-b border-[var(--border-soft)] px-5 py-2.5">
        {(Object.entries(LAYER_CONFIG) as [ChartLayer, typeof LAYER_CONFIG.cpu][]).map(
          ([key, cfg]) => (
            <label
              key={key}
              className="flex cursor-pointer select-none items-center gap-2 text-xs text-[var(--text-secondary)]"
            >
              <input
                aria-label={`Toggle ${cfg.label} layer`}
                type="checkbox"
                checked={layers[key]}
                onChange={() => toggleLayer(key)}
                className="accent-[var(--accent-primary)]"
              />
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: cfg.color }}
              />
              {cfg.label}
              <span className="font-mono text-[var(--text-muted)]">
                {formatChartValue(cfg.unit, curValue(cfg.dataKey) as number | null)}
              </span>
            </label>
          ),
        )}
      </div>
      <div className="px-3 pb-3 pt-2">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartPoints} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-soft)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                minTickGap={50}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                stroke="var(--border-soft)"
              />
              <YAxis
                domain={axisMode === "bytes" ? [0, "auto"] : [0, 100]}
                tickFormatter={(v: number) => formatChartValue(axisMode, v)}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                stroke="var(--border-soft)"
                width={46}
              />
              <Tooltip content={<ChartTooltip />} />
              {(Object.entries(LAYER_CONFIG) as [ChartLayer, typeof LAYER_CONFIG.cpu][]).map(
                ([key, cfg]) =>
                  layers[key] && cfg.area ? (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={cfg.dataKey}
                      name={cfg.label}
                      stroke={cfg.color}
                      fill={cfg.color}
                      fillOpacity={0.08}
                    />
                  ) : (
                    layers[key] && (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={cfg.dataKey}
                        name={cfg.label}
                        stroke={cfg.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    )
                  ),
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-5 py-2.5 text-xs text-[var(--text-secondary)]">
        <span>
          {Object.values(layers).filter(Boolean).length} layers &middot;{" "}
          {overview.history.points.length} samples
        </span>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Download size={12} /> CSV
        </button>
      </div>
    </div>
  );
}

function ChartTooltip({
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
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-mono text-[0.6rem] text-[var(--text-muted)]">
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
  return Object.values(LAYER_CONFIG).find((cfg) => cfg.label === name)?.unit ?? "percent";
}
