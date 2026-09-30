"""Service aggregate metrics collection.

Points are stored in the camelCase shape sent to clients, so snapshots,
history, and stream deltas share one payload.
"""

from __future__ import annotations

from collections import deque
from datetime import UTC, datetime
from typing import Any

from .config import Settings


class MetricsBuffer:
    def __init__(self, settings: Settings):
        max_points = max(1, (settings.retention_minutes * 60) // settings.sample_interval_seconds)
        self.points: deque[dict[str, Any]] = deque(maxlen=max_points)

    def append(self, point: dict[str, Any]) -> None:
        self.points.append(point)


def collect_metrics(services: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "cpuPercent": _sum_numeric(services, "cpuPercent"),
        "ramPercent": _memory_percent(services),
        "diskReadBytes": _sum_int(services, "diskReadBytes"),
        "diskWriteBytes": _sum_int(services, "diskWriteBytes"),
        "networkRxBytes": _sum_int(services, "networkRxBytes"),
        "networkTxBytes": _sum_int(services, "networkTxBytes"),
        "services": [
            {
                "name": str(service.get("name")),
                "cpuPercent": _numeric_value(service.get("cpuPercent")),
                "ramPercent": _service_memory_percent(service),
                "diskReadBytes": _int_value(service.get("diskReadBytes")),
                "diskWriteBytes": _int_value(service.get("diskWriteBytes")),
                "networkRxBytes": _int_value(service.get("networkRxBytes")),
                "networkTxBytes": _int_value(service.get("networkTxBytes")),
            }
            for service in services
            if service.get("name")
        ],
    }


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
