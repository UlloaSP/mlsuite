"""Pydantic models for agent contracts."""

from typing import Literal

from pydantic import BaseModel, Field


class MetricPoint(BaseModel):
    timestamp: str
    cpuPercent: float
    ramPercent: float
    diskPercent: float
    vramPercent: float | None = None


class MetricSeries(BaseModel):
    sampleIntervalSeconds: int
    retentionMinutes: int
    supported: bool = True
    points: list[MetricPoint] = Field(default_factory=list)


class HostMetricValue(BaseModel):
    percent: float | None
    supported: bool = True


class HostMetrics(BaseModel):
    cpu: HostMetricValue
    ram: HostMetricValue
    disk: HostMetricValue
    vram: HostMetricValue


class ServiceStatus(BaseModel):
    name: str
    containerName: str | None = None
    status: str
    health: str | None = None
    uptime: str | None = None
    cpuPercent: float | None = None
    memoryBytes: int | None = None
    ports: list[str] = Field(default_factory=list)
    terminalEnabled: bool = True


class InfrastructureOverview(BaseModel):
    host: HostMetrics
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
