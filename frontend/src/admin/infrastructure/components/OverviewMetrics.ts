import { formatBytes, formatPercent } from "../formatters";
import type { MetricPointDto } from "../types";

export type ChartLayer = "cpu" | "ram" | "diskRead" | "diskWrite" | "networkRx" | "networkTx";

export type ChartValueKey = Exclude<keyof MetricPointDto, "timestamp" | "services">;

export const LAYER_CONFIG: Record<ChartLayer, { label: string; color: string; dataKey: ChartValueKey; unit: "percent" | "bytes"; area: boolean }> = {
	cpu: { label: "CPU", color: "#6366f1", dataKey: "cpuPercent", unit: "percent", area: false },
	ram: { label: "RAM", color: "#10b981", dataKey: "ramPercent", unit: "percent", area: true },
	diskRead: { label: "Disk read", color: "#f59e0b", dataKey: "diskReadBytes", unit: "bytes", area: false },
	diskWrite: { label: "Disk write", color: "#ef4444", dataKey: "diskWriteBytes", unit: "bytes", area: false },
	networkRx: { label: "Net rx", color: "#0ea5e9", dataKey: "networkRxBytes", unit: "bytes", area: false },
	networkTx: { label: "Net tx", color: "#8b5cf6", dataKey: "networkTxBytes", unit: "bytes", area: false },
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
	const active = Object.entries(layers).reduce<Array<"percent" | "bytes">>((units, [key, enabled]) => {
		if (enabled) {
			units.push(LAYER_CONFIG[key as ChartLayer].unit);
		}
		return units;
	}, []);
	return active.length > 0 && active.every((unit) => unit === "bytes") ? "bytes" : "percent";
}
