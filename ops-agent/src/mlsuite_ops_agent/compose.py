"""Docker compose helpers."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
import re
from typing import Any

from .config import Settings


SIZE_UNITS = {
    "b": 1,
    "kb": 1000,
    "mb": 1000**2,
    "gb": 1000**3,
    "tb": 1000**4,
    "kib": 1024,
    "mib": 1024**2,
    "gib": 1024**3,
    "tib": 1024**4,
}


def _missing_service(name: str) -> dict[str, Any]:
    return {
        "name": name,
        "containerName": None,
        "status": "missing",
        "health": None,
        "uptime": None,
        "cpuPercent": None,
        "memoryBytes": None,
        "memoryLimitBytes": None,
        "diskReadBytes": None,
        "diskWriteBytes": None,
        "networkRxBytes": None,
        "networkTxBytes": None,
        "ports": [],
        "terminalEnabled": False,
    }


class ComposeError(RuntimeError):
    """Raised when docker compose command fails."""


class ComposeGateway:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.compose_files = tuple(str(Path(path)) for path in settings.compose_files)
        self.managed_services = set(settings.managed_services)
        self.terminal_services = set(settings.terminal_services)

    def compose_command(self, *args: str) -> list[str]:
        command = [self.settings.docker_bin, "compose"]
        for compose_file in self.compose_files:
            command.extend(["-f", compose_file])
        if self.settings.compose_project:
            command.extend(["-p", self.settings.compose_project])
        command.extend(args)
        return command

    def service_command(self, service_name: str, *args: str) -> list[str]:
        self.assert_managed(service_name)
        return self.compose_command(*args, service_name)

    def assert_managed(self, service_name: str) -> None:
        if service_name not in self.managed_services:
            raise ComposeError(f"Unknown managed service: {service_name}")

    def assert_terminal_enabled(self, service_name: str) -> None:
        self.assert_managed(service_name)
        if service_name not in self.terminal_services:
            raise ComposeError(f"Shell disabled for service: {service_name}")

    async def run(self, *args: str) -> str:
        command = self.compose_command(*args)
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            detail = stderr.decode("utf-8", "ignore").strip() or stdout.decode("utf-8", "ignore").strip()
            raise ComposeError(detail or f"Command failed: {' '.join(command)}")
        return stdout.decode("utf-8", "ignore")

    async def service_snapshot(self) -> list[dict[str, Any]]:
        ps_rows = _parse_json_rows(await self.run("ps", "--all", "--format", "json"))
        # One project-wide call; stats only lists running containers, keyed by container name.
        stats_output = await self.run("stats", "--no-stream", "--format", "json")
        stats = {row.get("Name"): row for row in _parse_json_rows(stats_output)}
        rows: list[dict[str, Any]] = []
        for row in ps_rows:
            service_name = row.get("Service") or row.get("Name")
            if service_name not in self.managed_services:
                continue
            stat = stats.get(row.get("Name")) or {}
            memory_bytes, memory_limit_bytes = _parse_byte_pair(stat.get("MemUsage"))
            disk_read_bytes, disk_write_bytes = _parse_byte_pair(stat.get("BlockIO"))
            network_rx_bytes, network_tx_bytes = _parse_byte_pair(stat.get("NetIO"))
            rows.append({
                "name": service_name,
                "containerName": row.get("Name"),
                "status": (row.get("State") or "unknown").lower(),
                "health": _normalize_health(row.get("Health")),
                "uptime": row.get("RunningFor"),
                "cpuPercent": _parse_percent(stat.get("CPUPerc")),
                "memoryBytes": memory_bytes,
                "memoryLimitBytes": memory_limit_bytes,
                "diskReadBytes": disk_read_bytes,
                "diskWriteBytes": disk_write_bytes,
                "networkRxBytes": network_rx_bytes,
                "networkTxBytes": network_tx_bytes,
                "ports": _parse_ports(row.get("Publishers")),
                "terminalEnabled": service_name in self.terminal_services,
            })
        present = {row["name"] for row in rows}
        missing = [_missing_service(name) for name in sorted(self.managed_services) if name not in present]
        return [*rows, *missing]

    async def action(self, service_name: str, action: str) -> None:
        self.assert_managed(service_name)
        match action:
            case "START":
                await self.run("up", "-d", "--no-deps", service_name)
            case "STOP":
                await self.run("stop", service_name)
            case "RESTART":
                await self.run("restart", service_name)
            case _:
                raise ComposeError(f"Unsupported action: {action}")

    async def logs_snapshot(self, service_name: str, tail_lines: int) -> list[str]:
        self.assert_managed(service_name)
        output = await self.run("logs", f"--tail={tail_lines}", service_name)
        return [line for line in output.splitlines() if line.strip()]


def _parse_json_rows(raw: str) -> list[dict[str, Any]]:
    text = raw.strip()
    if not text:
        return []
    if text.startswith("["):
        data = json.loads(text)
        return data if isinstance(data, list) else [data]
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def _parse_ports(raw_publishers: Any) -> list[str]:
    if not raw_publishers:
        return []
    if isinstance(raw_publishers, list):
        ports = []
        for item in raw_publishers:
            published = item.get("PublishedPort")
            target = item.get("TargetPort")
            protocol = item.get("Protocol", "tcp")
            ports.append(f"{published}:{target}/{protocol}")
        return ports
    return [str(raw_publishers)]


def _normalize_health(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    return text or None


def _parse_percent(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace("%", "")
    try:
        return round(float(text), 2)
    except ValueError:
        return None


def _parse_memory_bytes(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip().lower()
    match = re.match(r"([0-9.]+)\s*([a-z]+)", text)
    if not match:
        return None
    amount = float(match.group(1))
    unit = match.group(2)
    multiplier = SIZE_UNITS.get(unit)
    if multiplier is None:
        return None
    return int(amount * multiplier)


def _parse_byte_pair(value: Any) -> tuple[int | None, int | None]:
    """Parse docker stats pairs such as "1MiB / 2MiB" or "3MB / 4MB"."""
    if value is None:
        return None, None
    parts = str(value).split("/", 1)
    left = _parse_memory_bytes(parts[0])
    right = _parse_memory_bytes(parts[1]) if len(parts) > 1 else None
    return left, right
