"""Terminal session management."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, UTC
import uuid

from .compose import ComposeError, ComposeGateway


@dataclass
class TerminalSession:
    session_id: str
    service_name: str
    process: asyncio.subprocess.Process
    queue: asyncio.Queue[dict[str, object]]
    last_activity: datetime = field(default_factory=lambda: datetime.now(UTC))
    cols: int = 120
    rows: int = 36
    attached: bool = False
    reader_task: asyncio.Task[None] | None = None

    def touch(self) -> None:
        self.last_activity = datetime.now(UTC)


class TerminalManager:
    def __init__(self, compose: ComposeGateway, max_sessions: int, idle_minutes: int):
        self.compose = compose
        self.max_sessions = max_sessions
        self.idle_minutes = idle_minutes
        self.sessions: dict[str, TerminalSession] = {}

    async def create(self, service_name: str, cols: int, rows: int) -> TerminalSession:
        if len(self.sessions) >= self.max_sessions:
            raise ComposeError("Maximum terminal sessions reached.")
        self.compose.assert_managed(service_name)
        command = self.compose.compose_command(
            "exec",
            "-T",
            service_name,
            "sh",
            "-lc",
            "if [ -x /bin/sh ]; then exec /bin/sh; elif [ -x /bin/bash ]; then exec /bin/bash; else echo 'Shell unavailable'; exit 1; fi",
        )
        process = await asyncio.create_subprocess_exec(
            *command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        session = TerminalSession(
            session_id=str(uuid.uuid4()),
            service_name=service_name,
            process=process,
            queue=asyncio.Queue(),
            cols=cols,
            rows=rows,
        )
        session.reader_task = asyncio.create_task(self._pump_output(session))
        self.sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> TerminalSession | None:
        return self.sessions.get(session_id)

    async def write(self, session_id: str, data: str) -> None:
        session = self.require(session_id)
        if session.process.stdin is None:
            raise ComposeError("Terminal stdin unavailable.")
        session.process.stdin.write(data.encode("utf-8"))
        await session.process.stdin.drain()
        session.touch()

    async def resize(self, session_id: str, cols: int, rows: int) -> None:
        session = self.require(session_id)
        session.cols = cols
        session.rows = rows
        session.touch()

    async def close(self, session_id: str) -> None:
        session = self.sessions.pop(session_id, None)
        if session is None:
            return
        if session.reader_task is not None:
            session.reader_task.cancel()
        if session.process.returncode is None:
            session.process.terminate()
            try:
                await asyncio.wait_for(session.process.wait(), timeout=2)
            except asyncio.TimeoutError:
                session.process.kill()
                await session.process.wait()

    async def prune_idle(self) -> None:
        cutoff = datetime.now(UTC) - timedelta(minutes=self.idle_minutes)
        stale = [session_id for session_id, session in self.sessions.items() if session.last_activity < cutoff]
        for session_id in stale:
            await self.close(session_id)

    def require(self, session_id: str) -> TerminalSession:
        session = self.get(session_id)
        if session is None:
            raise ComposeError("Terminal session not found.")
        return session

    async def _pump_output(self, session: TerminalSession) -> None:
        try:
            while True:
                chunk = await session.process.stdout.read(2048)
                if not chunk:
                    break
                await session.queue.put({"type": "output", "data": chunk.decode("utf-8", "ignore")})
                session.touch()
            code = await session.process.wait()
            await session.queue.put({"type": "exit", "code": code})
        finally:
            session.touch()
