export type MetricPointDto = {
	timestamp: string;
	cpuPercent: number;
	ramPercent: number;
	diskPercent: number;
	vramPercent: number | null;
};

export type HostMetricValueDto = {
	percent: number | null;
	supported: boolean;
};

export type HostMetricsDto = {
	cpu: HostMetricValueDto;
	ram: HostMetricValueDto;
	disk: HostMetricValueDto;
	vram: HostMetricValueDto;
};

export type MetricSeriesDto = {
	sampleIntervalSeconds: number;
	retentionMinutes: number;
	supported: boolean;
	points: MetricPointDto[];
};

export type ServiceStatusDto = {
	name: string;
	containerName: string | null;
	status: string;
	health: string | null;
	uptime: string | null;
	cpuPercent: number | null;
	memoryBytes: number | null;
	ports: string[];
	terminalEnabled: boolean;
};

export type InfrastructureOverviewDto = {
	host: HostMetricsDto;
	services: ServiceStatusDto[];
	history: MetricSeriesDto;
};

export type ServiceLogsSnapshotDto = {
	serviceName: string;
	lines: string[];
};

export type TerminalSessionDto = {
	sessionId: string;
	wsPath: string;
};

export type OverviewDeltaEvent = {
	type: "overview.delta";
	payload: {
		host: MetricPointDto & { vramSupported: boolean };
		services: ServiceStatusDto[];
	};
};

export type OverviewSnapshotEvent = {
	type: "overview.snapshot";
	payload: InfrastructureOverviewDto;
};

export type ServiceLogEvent = {
	type: "service.log.line";
	serviceName: string;
	line: string;
};

export type TerminalFrame =
	| { type: "input"; data: string }
	| { type: "resize"; cols: number; rows: number }
	| { type: "output"; data: string }
	| { type: "exit"; code: number }
	| { type: "error"; message: string };

export type InfrastructureEvent =
	| OverviewDeltaEvent
	| OverviewSnapshotEvent
	| ServiceLogEvent
	| { type: "error"; message: string };

export function isOverviewSnapshotEvent(
	event: InfrastructureEvent,
): event is OverviewSnapshotEvent {
	return event.type === "overview.snapshot";
}

export function isOverviewDeltaEvent(
	event: InfrastructureEvent,
): event is OverviewDeltaEvent {
	return event.type === "overview.delta";
}

export function isServiceLogEvent(
	event: InfrastructureEvent,
): event is ServiceLogEvent {
	return event.type === "service.log.line";
}
