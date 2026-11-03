/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getRouteApi } from "@tanstack/react-router";
import { areaY, defineChart, lineY } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { decorative } from "@tanstack/charts/mark/decorative";
import { Chart } from "@tanstack/charts/react/tooltip";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { tooltip } from "@tanstack/charts/tooltip";
import { useSearchUpdate } from "@/shared/lib/use-search-update";
import { useState } from "react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppSelect } from "@/shared/ui/AppSelect";
import { formatTimestamp } from "@/features/infrastructure/lib/formatters";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import type { ChartLayer, ChartValueKey } from "@/features/infrastructure/lib/overview-metrics";
import {
  LAYER_CONFIG,
  chartPointForService,
  formatChartValue,
  yAxisMode,
} from "@/features/infrastructure/lib/overview-metrics";
import { ChartTooltip } from "./ChartTooltip";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";

const route = getRouteApi("/protected/app/superadmin/admin/infrastructure");

export function OverviewChartPanel({
  overview,
  streamConnected,
  chartRange,
}: {
  overview: InfrastructureOverviewDto;
  streamConnected: boolean;
  chartRange: string;
}) {
  const search = route.useSearch();
  const updateSearch = useSearchUpdate<typeof search>();
  const chartService = search.service;
  const setChartService = (value: typeof chartService) => updateSearch({ service: value });
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
  const layerEntries = Object.entries(LAYER_CONFIG) as [ChartLayer, typeof LAYER_CONFIG.cpu][];
  const shown = layerEntries.filter(([key]) => layers[key]).map(([, cfg]) => cfg);
  const peak = chartPoints.reduce(
    (max, point) => shown.reduce((top, cfg) => Math.max(top, point[cfg.dataKey]), max),
    0,
  );
  const guideLine = { stroke: "var(--color-line)", strokeOpacity: 1 };
  const definition = defineChart({
    marks: [
      crosshair({ x: guideLine, y: false }),
      ...shown.flatMap((cfg) => [
        ...(cfg.area
          ? [
              decorative(
                areaY(chartPoints, {
                  id: `${cfg.dataKey}-area`,
                  x: "timestamp",
                  y1: 0,
                  y2: cfg.dataKey,
                  fill: cfg.color,
                  fillOpacity: 0.08,
                }),
              ),
            ]
          : []),
        lineY(chartPoints, {
          id: cfg.dataKey,
          x: "timestamp",
          y: cfg.dataKey,
          z: () => cfg.label,
          stroke: cfg.color,
          strokeWidth: cfg.area ? 1 : 2,
        }),
      ]),
    ],
    scales: {
      x: {
        scale: () => scalePoint<string>(),
        axis: {
          line: guideLine,
          ticks: { size: 0, format: formatTimestamp },
          tickLabels: { fontSize: 10, opacity: 1, thin: { minGap: 50 } },
        },
      },
      y: {
        // Summed CPU can pass 100%; the axis grows to fit it instead of drawing off the chart.
        scale: scaleLinear().domain([0, axisMode === "bytes" ? peak || 1 : Math.max(100, peak)]),
        nice: axisMode === "bytes" || peak > 100,
        grid: { ...guideLine, strokeDasharray: "2 4" },
        axis: {
          line: guideLine,
          ticks: { line: guideLine, format: (v: number) => formatChartValue(axisMode, v) },
          tickLabels: { fontSize: 10, opacity: 1 },
        },
      },
    },
    theme: { muted: "var(--color-fg-muted)" },
    focus: "group-x",
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      sort: "color-domain",
      items: [
        { channel: "x", text: (point) => formatTimestamp(point.datum.timestamp) },
        {
          channel: "y",
          text: (point) => {
            const cfg = shown.find((layer) => layer.label === point.group);
            return cfg ? formatChartValue(cfg.unit, point.datum[cfg.dataKey]) : null;
          },
        },
      ],
    },
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-fg">
            Service aggregate load &middot; last {chartRange}
          </p>
          <p className="mt-0.5 text-xs text-fg-secondary">
            Toggle layers to compare Docker CPU, memory, disk, and network metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppSelect
            aria-label="Select chart service"
            className="min-w-36"
            size="sm"
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
          <AppBadge tone={streamConnected ? "success" : "warning"}>
            {streamConnected ? "Live" : "Snapshot"}
          </AppBadge>
          <AppBadge>{overview.history.sampleIntervalSeconds}s sample</AppBadge>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 border-b border-line px-5 py-2.5">
        {layerEntries.map(([key, cfg]) => (
          <label
            key={key}
            className="flex cursor-pointer select-none items-center gap-2 text-xs text-fg-secondary"
          >
            <AppCheckbox
              aria-label={`Show ${cfg.label} layer`}
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
            />
            <span className="inline-block size-2.5 rounded-sm" style={{ background: cfg.color }} />
            {cfg.label}
            <span className="font-mono text-fg-muted">
              {formatChartValue(cfg.unit, curValue(cfg.dataKey) as number | null)}
            </span>
          </label>
        ))}
      </div>
      {/* The chart grows with its row (next to the signals panel) instead of a fixed height. */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
        <div className="min-h-60 flex-1">
          <Chart
            definition={definition}
            ariaLabel={`Service aggregate load, last ${chartRange}`}
            ariaDescription={shown.map((cfg) => cfg.label).join(", ")}
            style={{ height: "100%" }}
            renderTooltipBody={({ points }) => <ChartTooltip points={points} />}
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-fg-secondary">
        <span>
          {Object.values(layers).filter(Boolean).length} layers &middot;{" "}
          {overview.history.points.length} samples
        </span>
      </div>
    </div>
  );
}
