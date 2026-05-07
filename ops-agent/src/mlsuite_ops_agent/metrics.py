"""Host metrics collection."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, UTC
import os
from pathlib import Path
import shutil
import subprocess

import psutil

from .config import Settings


@dataclass
class MetricsSnapshot:
    timestamp: str
    cpu_percent: float
    ram_percent: float
    disk_percent: float
    vram_percent: float | None
    vram_supported: bool


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
                "diskPercent": point.disk_percent,
                "vramPercent": point.vram_percent,
            }
            for point in self.points
        ]


def collect_metrics() -> MetricsSnapshot:
    vram_percent, vram_supported = _collect_vram_percent()
    return MetricsSnapshot(
        timestamp=datetime.now(UTC).isoformat(),
        cpu_percent=round(psutil.cpu_percent(interval=None), 2),
        ram_percent=round(psutil.virtual_memory().percent, 2),
        disk_percent=round(psutil.disk_usage(_disk_root()).percent, 2),
        vram_percent=vram_percent,
        vram_supported=vram_supported,
    )


def _disk_root() -> str:
    anchor = Path.cwd().anchor
    return anchor or os.path.abspath(os.sep)


def _collect_vram_percent() -> tuple[float | None, bool]:
    if shutil.which("nvidia-smi") is None:
        return None, False
    result = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=memory.used,memory.total",
            "--format=csv,noheader,nounits",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None, False
    used_total = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if not used_total:
        return None, False
    used = 0.0
    total = 0.0
    for line in used_total:
        left, right = [part.strip() for part in line.split(",", 1)]
        used += float(left)
        total += float(right)
    if total <= 0:
        return None, False
    return round((used / total) * 100, 2), True
