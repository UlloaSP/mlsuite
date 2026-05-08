"""Service aggregate metrics collection."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from .config import Settings


@dataclass
class ServiceMetricSnapshot:
    name: str
    cpu_percent: float
    ram_percent: float
    disk_read_bytes: int
    disk_write_bytes: int
    network_rx_bytes: int
    network_tx_bytes: int


@dataclass
class MetricsSnapshot:
    timestamp: str
    cpu_percent: float
    ram_percent: float
    disk_read_bytes: int
    disk_write_bytes: int
    network_rx_bytes: int
    network_tx_bytes: int
    services: list[ServiceMetricSnapshot]


class MetricsBuffer:
    def __init__(self, settings: Settings):
        max_points = max(1, (settings.retention_minutes * 60) // settings.sample_interval_seconds)
        self.points: deque[MetricsSnapshot] = deque(maxlen=max_points)
        self.settings = settings

    def append(self, snapshot: MetricsSnapshot) -> None:
        self.points.append(snapshot)

    def as_points(self) -> list[dict[str, object]]:
        return [
            {
                "timestamp": point.timestamp,
                "cpuPercent": point.cpu_percent,
                "ramPercent": point.ram_percent,
                "diskReadBytes": point.disk_read_bytes,
                "diskWriteBytes": point.disk_write_bytes,
                "networkRxBytes": point.network_rx_bytes,
                "networkTxBytes": point.network_tx_bytes,
                "services": [
                    {
                        "name": service.name,
                        "cpuPercent": service.cpu_percent,
                        "ramPercent": service.ram_percent,
                        "diskReadBytes": service.disk_read_bytes,
                        "diskWriteBytes": service.disk_write_bytes,
                        "networkRxBytes": service.network_rx_bytes,
                        "networkTxBytes": service.network_tx_bytes,
                    }
                    for service in point.services
                ],
            }
            for point in self.points
        ]


def collect_metrics(services: list[dict[str, Any]]) -> MetricsSnapshot:
    return MetricsSnapshot(
        timestamp=datetime.now(UTC).isoformat(),
        cpu_percent=_sum_numeric(services, "cpuPercent"),
        ram_percent=_memory_percent(services),
        disk_read_bytes=_sum_int(services, "diskReadBytes"),
        disk_write_bytes=_sum_int(services, "diskWriteBytes"),
        network_rx_bytes=_sum_int(services, "networkRxBytes"),
        network_tx_bytes=_sum_int(services, "networkTxBytes"),
        services=[
            ServiceMetricSnapshot(
                name=str(service.get("name")),
                cpu_percent=_numeric_value(service.get("cpuPercent")),
                ram_percent=_service_memory_percent(service),
                disk_read_bytes=_int_value(service.get("diskReadBytes")),
                disk_write_bytes=_int_value(service.get("diskWriteBytes")),
                network_rx_bytes=_int_value(service.get("networkRxBytes")),
                network_tx_bytes=_int_value(service.get("networkTxBytes")),
            )
            for service in services
            if service.get("name")
        ],
    )


def _sum_numeric(rows: list[dict[str, Any]], key: str) -> float:
    total = 0.0
    for row in rows:
        value = row.get(key)
        if isinstance(value, int | float):
            total += float(value)
    return round(total, 2)


def _numeric_value(value: Any) -> float:
    return round(float(value), 2) if isinstance(value, int | float) else 0.0


def _int_value(value: Any) -> int:
    return value if isinstance(value, int) else 0


def _memory_percent(services: list[dict[str, Any]]) -> float:
    used = _sum_int(services, "memoryBytes")
    limit = _sum_int(services, "memoryLimitBytes")
    if limit <= 0:
        return 0.0
    return round((used / limit) * 100, 2)


def _service_memory_percent(service: dict[str, Any]) -> float:
    used = service.get("memoryBytes")
    limit = service.get("memoryLimitBytes")
    if not isinstance(used, int) or not isinstance(limit, int) or limit <= 0:
        return 0.0
    return round((used / limit) * 100, 2)


def _sum_int(rows: list[dict[str, Any]], key: str) -> int:
    total = 0
    for row in rows:
        value = row.get(key)
        if isinstance(value, int):
            total += value
    return total
