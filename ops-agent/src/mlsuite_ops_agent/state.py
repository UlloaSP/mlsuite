"""Shared runtime state for infra dashboard agent."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket

from .compose import ComposeGateway, ComposeError
from .config import Settings
from .metrics import MetricsBuffer, collect_metrics, machine_load
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
        self._compose_failed = False
        # Notified when the first dashboard connects, so both loops switch to its cadence at once.
        self._watched = asyncio.Condition()

    async def start(self) -> None:
        try:
            self._latest_services = await self.compose.service_snapshot()
        except ComposeError:
            self._latest_services = []
            self._compose_failed = True
        self.metrics.append(collect_metrics(self._latest_services))
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
                "cpu": {"percent": latest["cpuPercent"]},
                "ram": {"percent": latest["ramPercent"]},
                "diskRead": {"bytes": latest["diskReadBytes"]},
                "diskWrite": {"bytes": latest["diskWriteBytes"]},
                "networkRx": {"bytes": latest["networkRxBytes"]},
                "networkTx": {"bytes": latest["networkTxBytes"]},
            },
            "services": self._latest_services,
            "history": {
                "sampleIntervalSeconds": self.sample_interval(),
                "retentionMinutes": self.settings.retention_minutes,
                "points": list(self.metrics.points),
            },
        }

    def load(self) -> dict[str, float | None] | None:
        """The machine's load, or None while nothing here says what the stack is doing."""
        measured = any(service.get("cpuPercent") is not None for service in self._latest_services)
        if self._compose_failed or not measured:
            return None
        return machine_load(self.metrics.points[-1]["cpuPercent"])

    def sample_interval(self) -> int:
        """Seconds between samples: fast while a dashboard watches, as slow as alerts allow otherwise."""
        return self.settings.sample_interval_seconds if self.clients else self.settings.idle_interval_seconds

    def service_interval(self) -> int:
        return self.settings.service_interval_seconds if self.clients else self.settings.idle_interval_seconds

    async def _pause(self, seconds: int) -> None:
        """Waits `seconds`, or less when a first dashboard connects meanwhile."""
        async with self._watched:
            try:
                await asyncio.wait_for(self._watched.wait(), timeout=seconds)
            except TimeoutError:
                pass

    async def register_client(self, websocket: WebSocket) -> StreamClient:
        client = StreamClient(websocket)
        first = not self.clients
        self.clients.add(client)
        if first:
            async with self._watched:
                self._watched.notify_all()
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
            point = collect_metrics(self._latest_services)
            self.metrics.append(point)
            await self.broadcast(
                {
                    "type": "overview.delta",
                    "payload": {"aggregate": point, "services": self._latest_services},
                }
            )
            await self._pause(self.sample_interval())

    async def _service_loop(self) -> None:
        while True:
            await self._pause(self.service_interval())
            try:
                self._latest_services = await self.compose.service_snapshot()
                self._compose_failed = False
            except ComposeError as error:
                self._compose_failed = True
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
