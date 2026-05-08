"""Pydantic models for agent contracts."""

from typing import Literal

from pydantic import BaseModel, Field


class ServiceMetricPoint(BaseModel):
    name: str
    cpuPercent: float
    ramPercent: float
    diskReadBytes: int
    diskWriteBytes: int
    networkRxBytes: int
    networkTxBytes: int


class MetricPoint(BaseModel):
    timestamp: str
    cpuPercent: float
    ramPercent: float
    diskReadBytes: int
    diskWriteBytes: int
    networkRxBytes: int
    networkTxBytes: int
    services: list[ServiceMetricPoint] = Field(default_factory=list)


class MetricSeries(BaseModel):
    sampleIntervalSeconds: int
    retentionMinutes: int
    points: list[MetricPoint] = Field(default_factory=list)


class ServiceAggregateMetricValue(BaseModel):
    percent: float | None
    supported: bool = True


class ServiceAggregateByteValue(BaseModel):
    bytes: int | None
    supported: bool = True


class ServiceAggregateMetrics(BaseModel):
    cpu: ServiceAggregateMetricValue
    ram: ServiceAggregateMetricValue
    diskRead: ServiceAggregateByteValue
    diskWrite: ServiceAggregateByteValue
    networkRx: ServiceAggregateByteValue
    networkTx: ServiceAggregateByteValue


class ServiceStatus(BaseModel):
    name: str
    containerName: str | None = None
    status: str
    health: str | None = None
    uptime: str | None = None
    cpuPercent: float | None = None
    memoryBytes: int | None = None
    memoryLimitBytes: int | None = None
    diskReadBytes: int | None = None
    diskWriteBytes: int | None = None
    networkRxBytes: int | None = None
    networkTxBytes: int | None = None
    ports: list[str] = Field(default_factory=list)
    terminalEnabled: bool = True


class InfrastructureOverview(BaseModel):
    aggregate: ServiceAggregateMetrics
    services: list[ServiceStatus]
    history: MetricSeries


class ServiceActionRequest(BaseModel):
    action: Literal["START", "STOP", "RESTART"]


class ServiceLogsSnapshot(BaseModel):
    serviceName: str
    lines: list[str]


class TerminalSessionRequest(BaseModel):
    serviceName: str
    cols: int = 120
    rows: int = 36


class TerminalSessionResponse(BaseModel):
    sessionId: str
    wsPath: str
