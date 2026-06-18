import { formatBytes, formatPercent } from "../formatters";
import type { MetricPointDto } from "../../../../admin/infrastructure/types";

/**
 * ChartLayer: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: derives chart layers, points, axes, and metric labels for infrastructure overview graphs.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type ChartLayer = "cpu" | "ram" | "diskRead" | "diskWrite" | "networkRx" | "networkTx";

/**
 * ChartValueKey: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: derives chart layers, points, axes, and metric labels for infrastructure overview graphs.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type ChartValueKey = Exclude<keyof MetricPointDto, "timestamp" | "services">;

/**
 * LAYER_CONFIG: exposes a stable constant used by this algorithm.
 *
 * Purpose: derives chart layers, points, axes, and metric labels for infrastructure overview graphs.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const LAYER_CONFIG: Record<
  ChartLayer,
  { label: string; color: string; dataKey: ChartValueKey; unit: "percent" | "bytes"; area: boolean }
> = {
  cpu: { label: "CPU", color: "#6366f1", dataKey: "cpuPercent", unit: "percent", area: false },
  ram: { label: "RAM", color: "#10b981", dataKey: "ramPercent", unit: "percent", area: true },
  diskRead: {
    label: "Disk read",
    color: "#f59e0b",
    dataKey: "diskReadBytes",
    unit: "bytes",
    area: false,
  },
  diskWrite: {
    label: "Disk write",
    color: "#ef4444",
    dataKey: "diskWriteBytes",
    unit: "bytes",
    area: false,
  },
  networkRx: {
    label: "Net rx",
    color: "#0ea5e9",
    dataKey: "networkRxBytes",
    unit: "bytes",
    area: false,
  },
  networkTx: {
    label: "Net tx",
    color: "#8b5cf6",
    dataKey: "networkTxBytes",
    unit: "bytes",
    area: false,
  },
};

/**
 * formatChartValue: converts raw data into a stable human-readable string
 *
 * Purpose: derives chart layers, points, axes, and metric labels for infrastructure overview graphs.
 * @param unit - Input consumed by formatChartValue; uses the derives chart layers, points, axes, and metric labels for infrastructure overview graphs contract.
 * @param value - Input consumed by formatChartValue; uses the derives chart layers, points, axes, and metric labels for infrastructure overview graphs contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function formatChartValue(unit: "percent" | "bytes", value: number | null | undefined) {
  return unit === "bytes" ? formatBytes(value) : formatPercent(value);
}

/**
 * chartPointForService: performs the exported transformation for this algorithm.
 *
 * Purpose: derives chart layers, points, axes, and metric labels for infrastructure overview graphs.
 * @param point - Input consumed by chartPointForService; uses the derives chart layers, points, axes, and metric labels for infrastructure overview graphs contract.
 * @param serviceName - Input consumed by chartPointForService; uses the derives chart layers, points, axes, and metric labels for infrastructure overview graphs contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function chartPointForService(point: MetricPointDto, serviceName: string): MetricPointDto {
  const servicePoint = point.services.find((service) => service.name === serviceName);
  return {
    timestamp: point.timestamp,
    cpuPercent: servicePoint?.cpuPercent ?? 0,
    ramPercent: servicePoint?.ramPercent ?? 0,
    diskReadBytes: servicePoint?.diskReadBytes ?? 0,
    diskWriteBytes: servicePoint?.diskWriteBytes ?? 0,
    networkRxBytes: servicePoint?.networkRxBytes ?? 0,
    networkTxBytes: servicePoint?.networkTxBytes ?? 0,
    services: point.services,
  };
}

/**
 * yAxisMode: performs the exported transformation for this algorithm.
 *
 * Purpose: derives chart layers, points, axes, and metric labels for infrastructure overview graphs.
 * @param layers - Input consumed by yAxisMode; uses the derives chart layers, points, axes, and metric labels for infrastructure overview graphs contract.
 * @param boolean - Input consumed by yAxisMode; uses the derives chart layers, points, axes, and metric labels for infrastructure overview graphs contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function yAxisMode(layers: Record<ChartLayer, boolean>) {
  const active = Object.entries(layers).reduce<Array<"percent" | "bytes">>(
    (units, [key, enabled]) => {
      if (enabled) {
        units.push(LAYER_CONFIG[key as ChartLayer].unit);
      }
      return units;
    },
    [],
  );
  return active.length > 0 && active.every((unit) => unit === "bytes") ? "bytes" : "percent";
}
