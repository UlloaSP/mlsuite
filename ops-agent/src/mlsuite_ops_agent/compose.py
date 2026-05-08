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


class ComposeError(RuntimeError):
    """Raised when docker compose command fails."""


class ComposeGateway:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.compose_file = str(Path(settings.compose_file))
        self.managed_services = set(settings.managed_services)
        self.terminal_services = set(settings.terminal_services)

    def compose_command(self, *args: str) -> list[str]:
        command = [self.settings.docker_bin, "compose", "-f", self.compose_file]
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
        ps_output = await self.run("ps", "--format", "json")
        ps_rows = _parse_json_rows(ps_output)
        stats_output = await self._docker_stats()
        stats = {row.get("Name"): row for row in _parse_json_rows(stats_output)}
        rows: list[dict[str, Any]] = []
        for row in ps_rows:
            service_name = row.get("Service") or row.get("Name")
            if service_name not in self.managed_services:
                continue
            stat = stats.get(row.get("Name"))
            memory_bytes, memory_limit_bytes = _parse_memory_usage(stat.get("MemUsage")) if stat else (None, None)
            disk_read_bytes, disk_write_bytes = _parse_io_bytes(stat.get("BlockIO")) if stat else (None, None)
            network_rx_bytes, network_tx_bytes = _parse_io_bytes(stat.get("NetIO")) if stat else (None, None)
            rows.append(
                {
                    "name": service_name,
                    "containerName": row.get("Name"),
                    "status": (row.get("State") or "unknown").lower(),
                    "health": _normalize_health(row.get("Health")),
                    "uptime": row.get("RunningFor"),
                    "cpuPercent": _parse_percent(stat.get("CPUPerc")) if stat else None,
                    "memoryBytes": memory_bytes,
                    "memoryLimitBytes": memory_limit_bytes,
                    "diskReadBytes": disk_read_bytes,
                    "diskWriteBytes": disk_write_bytes,
                    "networkRxBytes": network_rx_bytes,
                    "networkTxBytes": network_tx_bytes,
                    "ports": _parse_ports(row.get("Publishers")),
                    "terminalEnabled": service_name in self.terminal_services,
                }
            )
        for service_name in sorted(self.managed_services):
            if any(row["name"] == service_name for row in rows):
                continue
            rows.append(
                {
                    "name": service_name,
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
            )
        return rows

    async def _docker_stats(self) -> str:
        names = await self.run("ps", "--services")
        services = [item.strip() for item in names.splitlines() if item.strip() in self.managed_services]
        if not services:
            return ""
        rows = []
        for service_name in services:
            rows.append(await self.run("stats", "--no-stream", "--format", "json", service_name))
        return "\n".join(row.strip() for row in rows if row.strip())

    async def action(self, service_name: str, action: str) -> None:
        self.assert_managed(service_name)
        match action:
            case "START":
                await self.run("up", "-d", service_name)
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


def _parse_memory_usage(value: Any) -> tuple[int | None, int | None]:
    if value is None:
        return None, None
    parts = str(value).split("/", 1)
    used = _parse_memory_bytes(parts[0])
    limit = _parse_memory_bytes(parts[1]) if len(parts) > 1 else None
    return used, limit


def _parse_io_bytes(value: Any) -> tuple[int | None, int | None]:
    if value is None:
        return None, None
    parts = str(value).split("/", 1)
    left = _parse_memory_bytes(parts[0])
    right = _parse_memory_bytes(parts[1]) if len(parts) > 1 else None
    return left, right
