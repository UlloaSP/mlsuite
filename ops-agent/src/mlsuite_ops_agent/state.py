"""Shared runtime state for infra dashboard agent."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket

from .compose import ComposeGateway, ComposeError
from .config import Settings
from .metrics import MetricsBuffer, collect_metrics
from .terminal import TerminalManager


class StreamClient:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.log_task: asyncio.Task[None] | None = None


class AgentState:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.compose = ComposeGateway(settings)
        self.metrics = MetricsBuffer(settings)
        self.terminals = TerminalManager(
            self.compose,
            settings.terminal_max_sessions,
            settings.terminal_idle_minutes,
        )
        self.clients: set[StreamClient] = set()
        self.sampler_task: asyncio.Task[None] | None = None
        self.service_task: asyncio.Task[None] | None = None
        self.cleanup_task: asyncio.Task[None] | None = None
        self._latest_services: list[dict[str, Any]] = []

    async def start(self) -> None:
        try:
            self._latest_services = await self.compose.service_snapshot()
        except ComposeError:
            self._latest_services = []
        first = collect_metrics(self._latest_services)
        self.metrics.append(first)
        self.sampler_task = asyncio.create_task(self._sample_loop())
        self.service_task = asyncio.create_task(self._service_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self) -> None:
        for task in (self.sampler_task, self.service_task, self.cleanup_task):
            if task is not None:
                task.cancel()
        for session_id in list(self.terminals.sessions):
            await self.terminals.close(session_id)
        for client in list(self.clients):
            await self.unregister_client(client)

    async def snapshot(self) -> dict[str, Any]:
        if not self._latest_services:
            self._latest_services = await self.compose.service_snapshot()
        latest = self.metrics.points[-1]
        return {
            "aggregate": {
                "cpu": {"percent": latest.cpu_percent, "supported": True},
                "ram": {"percent": latest.ram_percent, "supported": True},
                "diskRead": {"bytes": latest.disk_read_bytes, "supported": True},
                "diskWrite": {"bytes": latest.disk_write_bytes, "supported": True},
                "networkRx": {"bytes": latest.network_rx_bytes, "supported": True},
                "networkTx": {"bytes": latest.network_tx_bytes, "supported": True},
            },
            "services": self._latest_services,
            "history": {
                "sampleIntervalSeconds": self.settings.sample_interval_seconds,
                "retentionMinutes": self.settings.retention_minutes,
                "points": self.metrics.as_points(),
            },
        }

    async def register_client(self, websocket: WebSocket) -> StreamClient:
        client = StreamClient(websocket)
        self.clients.add(client)
        await client.queue.put({"type": "overview.snapshot", "payload": await self.snapshot()})
        return client

    async def unregister_client(self, client: StreamClient) -> None:
        if client.log_task is not None:
            client.log_task.cancel()
        self.clients.discard(client)

    async def set_log_subscription(self, client: StreamClient, service_name: str) -> None:
        self.compose.assert_managed(service_name)
        if client.log_task is not None:
            client.log_task.cancel()
        client.log_task = asyncio.create_task(self._tail_logs(client, service_name))

    async def _sample_loop(self) -> None:
        while True:
            snapshot = collect_metrics(self._latest_services)
            self.metrics.append(snapshot)
            await self.broadcast(
                {
                    "type": "overview.delta",
                    "payload": {
                        "aggregate": {
                            "timestamp": snapshot.timestamp,
                            "cpuPercent": snapshot.cpu_percent,
                            "ramPercent": snapshot.ram_percent,
                            "diskReadBytes": snapshot.disk_read_bytes,
                            "diskWriteBytes": snapshot.disk_write_bytes,
                            "networkRxBytes": snapshot.network_rx_bytes,
                            "networkTxBytes": snapshot.network_tx_bytes,
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
                                for service in snapshot.services
                            ],
                        },
                        "services": self._latest_services,
                    },
                }
            )
            await asyncio.sleep(self.settings.sample_interval_seconds)

    async def _service_loop(self) -> None:
        while True:
            await asyncio.sleep(5)
            try:
                self._latest_services = await self.compose.service_snapshot()
            except ComposeError as error:
                await self.broadcast({"type": "error", "message": str(error)})

    async def _cleanup_loop(self) -> None:
        while True:
            await self.terminals.prune_idle()
            await asyncio.sleep(60)

    async def broadcast(self, event: dict[str, Any]) -> None:
        for client in list(self.clients):
            await client.queue.put(event)

    async def _tail_logs(self, client: StreamClient, service_name: str) -> None:
        process = await asyncio.create_subprocess_exec(
            *self.compose.compose_command("logs", "--tail=0", "-f", service_name),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                await client.queue.put(
                    {
                        "type": "service.log.line",
                        "serviceName": service_name,
                        "line": line.decode("utf-8", "ignore").rstrip(),
                    }
                )
        finally:
            if process.returncode is None:
                process.terminate()
                await process.wait()


def parse_topics(message: str) -> list[str]:
    payload = json.loads(message)
    if payload.get("type") != "subscribe":
        return []
    topics = payload.get("topics")
    return topics if isinstance(topics, list) else []
