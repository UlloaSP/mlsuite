export type ServiceMetricPointDto = {
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

export type ServiceAggregateMetricValueDto = {
  percent: number | null;
  supported: boolean;
};

export type ServiceAggregateByteValueDto = {
  bytes: number | null;
  supported: boolean;
};

export type ServiceAggregateMetricsDto = {
  cpu: ServiceAggregateMetricValueDto;
  ram: ServiceAggregateMetricValueDto;
  diskRead: ServiceAggregateByteValueDto;
  diskWrite: ServiceAggregateByteValueDto;
  networkRx: ServiceAggregateByteValueDto;
  networkTx: ServiceAggregateByteValueDto;
};

export type MetricSeriesDto = {
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

export type InfrastructureEvent =
  | OverviewDeltaEvent
  | OverviewSnapshotEvent
  | ServiceLogEvent
  | { type: "error"; message: string };

export type TerminalFrame =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "output"; data: string }
  | { type: "exit"; code: number }
  | { type: "error"; message: string };

export type ServiceAction = "START" | "STOP" | "RESTART";

export const isOverviewDeltaEvent = (event: InfrastructureEvent): event is OverviewDeltaEvent =>
  event.type === "overview.delta";

export const isOverviewSnapshotEvent = (
  event: InfrastructureEvent,
): event is OverviewSnapshotEvent => event.type === "overview.snapshot";

export const isServiceLogEvent = (event: InfrastructureEvent): event is ServiceLogEvent =>
  event.type === "service.log.line";
