import { formatBytes } from "@/shared/lib/format-bytes";
import { formatPercent } from "@/features/infrastructure/lib/formatters";
import type { MetricPointDto } from "@/features/infrastructure/api/infrastructure.types";

export type ChartLayer = "cpu" | "ram" | "diskRead" | "diskWrite" | "networkRx" | "networkTx";

export type ChartValueKey = Exclude<keyof MetricPointDto, "timestamp" | "services">;

export const LAYER_CONFIG: Record<
  ChartLayer,
  { label: string; color: string; dataKey: ChartValueKey; unit: "percent" | "bytes"; area: boolean }
> = {
  cpu: {
    label: "CPU",
    color: "var(--color-chart-1)",
    dataKey: "cpuPercent",
    unit: "percent",
    area: false,
  },
  ram: {
    label: "RAM",
    color: "var(--color-chart-2)",
    dataKey: "ramPercent",
    unit: "percent",
    area: true,
  },
  diskRead: {
    label: "Disk read",
    color: "var(--color-chart-3)",
    dataKey: "diskReadBytes",
    unit: "bytes",
    area: false,
  },
  diskWrite: {
    label: "Disk write",
    color: "var(--color-chart-4)",
    dataKey: "diskWriteBytes",
    unit: "bytes",
    area: false,
  },
  networkRx: {
    label: "Net rx",
    color: "var(--color-chart-5)",
    dataKey: "networkRxBytes",
    unit: "bytes",
    area: false,
  },
  networkTx: {
    label: "Net tx",
    color: "var(--color-chart-6)",
    dataKey: "networkTxBytes",
    unit: "bytes",
    area: false,
  },
};

export function formatChartValue(unit: "percent" | "bytes", value: number | null | undefined) {
  return unit === "bytes" ? formatBytes(value) : formatPercent(value);
}

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
