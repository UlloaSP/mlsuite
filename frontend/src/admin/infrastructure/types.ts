type ServiceMetricPointDto = {
  name: string;
  cpuPercent: number;
  ramPercent: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
};

export type MetricPointDto = {
  timestamp: string;
  cpuPercent: number;
  ramPercent: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  services: ServiceMetricPointDto[];
};

type ServiceAggregateMetricValueDto = {
  percent: number | null;
  supported: boolean;
};

type ServiceAggregateByteValueDto = {
  bytes: number | null;
  supported: boolean;
};

type ServiceAggregateMetricsDto = {
  cpu: ServiceAggregateMetricValueDto;
  ram: ServiceAggregateMetricValueDto;
  diskRead: ServiceAggregateByteValueDto;
  diskWrite: ServiceAggregateByteValueDto;
  networkRx: ServiceAggregateByteValueDto;
  networkTx: ServiceAggregateByteValueDto;
};

type MetricSeriesDto = {
  sampleIntervalSeconds: number;
  retentionMinutes: number;
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
  memoryLimitBytes: number | null;
  diskReadBytes: number | null;
  diskWriteBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  ports: string[];
  terminalEnabled: boolean;
};

export type InfrastructureOverviewDto = {
  aggregate: ServiceAggregateMetricsDto;
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
    aggregate: MetricPointDto;
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

export function isOverviewDeltaEvent(event: InfrastructureEvent): event is OverviewDeltaEvent {
  return event.type === "overview.delta";
}

export function isServiceLogEvent(event: InfrastructureEvent): event is ServiceLogEvent {
  return event.type === "service.log.line";
}
