"""Public, read-only compose startup states for the frontend boot screen."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from .compose import ComposeGateway, _normalize_health, _parse_json_rows

# The route is unauthenticated, so requests share one cached snapshot instead of
# each spawning `docker compose`.
CACHE_SECONDS = 1.0


def startup_state(row: dict[str, Any] | None) -> str:
    """Map one `docker compose ps` row to a boot-screen state."""
    if row is None:
        return "waiting"
    state = str(row.get("State") or "").lower()
    health = _normalize_health(row.get("Health"))
    if state == "running":
        if health == "starting":
            return "checking"
        if health == "unhealthy":
            return "unhealthy"
        return "healthy" if health == "healthy" else "running"
    if state == "restarting":
        return "restarting"
    if state == "exited":
        return "completed" if row.get("ExitCode") == 0 else "exited"
    if state == "dead":
        return "exited"
    if state == "created":
        return "created"
    return "starting"


class StartupStatus:
    def __init__(self, compose: ComposeGateway):
        self.compose = compose
        self._services: list[str] | None = None
        self._states: list[str] = []
        self._fetched_at = float("-inf")
        self._lock = asyncio.Lock()

    async def states(self) -> list[str]:
        async with self._lock:
            if time.monotonic() - self._fetched_at >= CACHE_SECONDS:
                self._states = await self._read_states()
                self._fetched_at = time.monotonic()
            return self._states

    async def _read_states(self) -> list[str]:
        if self._services is None:
            listed = await self.compose.run("config", "--services")
            self._services = sorted(line.strip() for line in listed.splitlines() if line.strip())
        rows = _parse_json_rows(await self.compose.run("ps", "--all", "--format", "json"))
        by_service = {row.get("Service"): row for row in rows}
        return [startup_state(by_service.get(service)) for service in self._services]
