"""Terminal session management."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, UTC
import os
import uuid

from .compose import ComposeError, ComposeGateway


@dataclass
class TerminalSession:
    session_id: str
    service_name: str
    process: asyncio.subprocess.Process
    queue: asyncio.Queue[dict[str, object]]
    pty_fd: int | None = None
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
        self.compose.assert_terminal_enabled(service_name)
        command = self.compose.compose_command(
            "exec",
            service_name,
            "sh",
            "-lc",
            "if [ -x /bin/bash ]; then exec /bin/bash; elif [ -x /bin/sh ]; then exec /bin/sh; else echo 'Shell unavailable'; exit 1; fi",
        )
        process, pty_fd = await self._create_pty_process(command, cols, rows)
        session = TerminalSession(
            session_id=str(uuid.uuid4()),
            service_name=service_name,
            process=process,
            queue=asyncio.Queue(),
            pty_fd=pty_fd,
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
        if session.pty_fd is None:
            raise ComposeError("Terminal PTY unavailable.")
        await asyncio.to_thread(os.write, session.pty_fd, data.encode("utf-8"))
        session.touch()

    async def resize(self, session_id: str, cols: int, rows: int) -> None:
        session = self.require(session_id)
        session.cols = cols
        session.rows = rows
        if session.pty_fd is not None:
            self._resize_pty(session.pty_fd, cols, rows)
        session.touch()

    async def close(self, session_id: str) -> None:
        session = self.sessions.pop(session_id, None)
        if session is None:
            return
        if session.reader_task is not None:
            session.reader_task.cancel()
        if session.pty_fd is not None:
            try:
                os.close(session.pty_fd)
            except OSError:
                pass
            session.pty_fd = None
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
                if session.pty_fd is None:
                    break
                try:
                    chunk = await asyncio.to_thread(os.read, session.pty_fd, 2048)
                except OSError:
                    break
                if not chunk:
                    break
                await session.queue.put({"type": "output", "data": chunk.decode("utf-8", "ignore")})
                session.touch()
            code = await session.process.wait()
            await session.queue.put({"type": "exit", "code": code})
        finally:
            session.touch()

    async def _create_pty_process(
        self,
        command: list[str],
        cols: int,
        rows: int,
    ) -> tuple[asyncio.subprocess.Process, int]:
        if os.name != "posix":
            raise ComposeError("Interactive terminal requires a POSIX host.")
        import pty

        master_fd, slave_fd = pty.openpty()
        self._resize_pty(master_fd, cols, rows)
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
            )
        finally:
            os.close(slave_fd)
        return process, master_fd

    def _resize_pty(self, fd: int, cols: int, rows: int) -> None:
        if os.name != "posix":
            return
        import fcntl
        import signal
        import struct
        import termios

        size = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, size)
        for session in self.sessions.values():
            if session.pty_fd == fd and session.process.returncode is None:
                try:
                    os.kill(session.process.pid, signal.SIGWINCH)
                except OSError:
                    pass
                break
