"""Worker processes, each running one environment's interpreter, at most RUNTIME_WORKERS in all.

A request takes an idle worker of its environment, else starts one while the bound allows, else
stops the least recently used idle worker of another environment to make room, else waits for a
worker to come free. A busy environment can therefore use every process, and an idle one keeps
its warm workers until another needs the room. A worker that dies or overruns its timeout is
discarded, never reused.
"""

import asyncio
import contextlib
import importlib.util
import json
import os
import signal
from collections.abc import AsyncIterator, Callable
from pathlib import Path

from .config import BUNDLE_CACHE_BYTES, RUNTIME_WORKERS, WORKER_TIMEOUT_SECONDS
from .environments import Environment

WORKER_SCRIPT = Path(importlib.util.find_spec("mlsuite_worker").origin).with_name("__main__.py")
# An answer can carry a thousand records' reports.
_MAX_LINE = 64 * 1024 * 1024
# Model libraries would otherwise start a thread per core in every worker.
_ONE_THREAD = {name: "1" for name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS")}


class WorkerFailed(Exception):
    """The worker stopped or overran its timeout; its request has no answer."""


class WorkerError(Exception):
    """The worker answered that the request failed."""

    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


class Worker:
    def __init__(self, environment: Environment, process: asyncio.subprocess.Process) -> None:
        self.environment = environment
        self.process = process

    @classmethod
    async def start(cls, environment: Environment) -> "Worker":
        # Only what a worker needs: no secret of the runtime reaches the model's code.
        env = {"MLSUITE_BUNDLE_CACHE_BYTES": str(BUNDLE_CACHE_BYTES), "HOME": "/tmp", **_ONE_THREAD}
        if os.name == "nt":
            env["SYSTEMROOT"] = os.environ.get("SYSTEMROOT", "")
        process = await asyncio.create_subprocess_exec(
            str(environment.python), "-I", str(WORKER_SCRIPT),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, env=env, limit=_MAX_LINE,
        )
        return cls(environment, process)

    @property
    def alive(self) -> bool:
        return self.process.returncode is None

    async def call(self, request: dict[str, object]) -> object:
        try:
            self.process.stdin.write((json.dumps(request) + "\n").encode())
            await self.process.stdin.drain()
            line = await asyncio.wait_for(self.process.stdout.readline(), WORKER_TIMEOUT_SECONDS)
        except (TimeoutError, ConnectionError, ValueError) as error:
            await self.stop()
            raise WorkerFailed("The model worker did not answer in time") from error
        if not line:
            code = await self.process.wait()
            raise WorkerFailed(_exit_reason(code))
        answer = json.loads(line)
        if not answer["ok"]:
            raise WorkerError(answer["status"], answer["detail"])
        return answer["result"]

    async def stop(self) -> None:
        self.process.stdin.close()
        if self.alive:
            with contextlib.suppress(ProcessLookupError):
                self.process.kill()
        await self.process.wait()
        with contextlib.suppress(ConnectionError):
            await self.process.stdin.wait_closed()


def _exit_reason(code: int) -> str:
    if code < 0 and -code == getattr(signal, "SIGILL", None):
        return "The model worker stopped: its libraries need CPU instructions this host lacks (SIGILL)"
    if code < 0:
        return f"The model worker stopped on signal {-code}"
    return f"The model worker exited with status {code}"


class WorkerPool:
    def __init__(self, max_workers: int = RUNTIME_WORKERS, start: Callable = Worker.start) -> None:
        self._max = max_workers
        self._start = start
        self._idle: list[Worker] = []  # least recently used first
        self._count = 0
        self._free = asyncio.Condition()

    @contextlib.asynccontextmanager
    async def worker(self, environment: Environment) -> AsyncIterator[Worker]:
        worker = await self._acquire(environment)
        try:
            yield worker
        finally:
            await self._release(worker)

    async def _acquire(self, environment: Environment) -> Worker:
        async with self._free:
            while True:
                for worker in self._idle:
                    if worker.environment == environment:
                        self._idle.remove(worker)
                        if worker.alive:
                            return worker
                        self._count -= 1
                        break
                else:
                    if self._count < self._max or self._idle:
                        break
                    await self._free.wait()
            evicted = self._idle.pop(0) if self._count >= self._max else None
            if evicted is None:
                self._count += 1
        if evicted is not None:
            await evicted.stop()
        try:
            return await self._start(environment)
        except BaseException:
            async with self._free:
                self._count -= 1
                self._free.notify()
            raise

    async def _release(self, worker: Worker) -> None:
        async with self._free:
            if worker.alive:
                self._idle.append(worker)
            else:
                self._count -= 1
            self._free.notify()

    async def close(self) -> None:
        async with self._free:
            idle, self._idle = self._idle, []
            self._count -= len(idle)
        for worker in idle:
            await worker.stop()
